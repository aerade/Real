#!/usr/bin/env python3
"""Run Parser2GIS without blocking on a permanently pending background request."""

from __future__ import annotations

import argparse
import ast
from collections import Counter
import html
import json
import os
import re
import sys
import time
import urllib.request
from urllib.parse import urljoin

from parser_2gis.chrome import browser as chrome_browser
from parser_2gis.config import Configuration
from parser_2gis.parser import get_parser
from parser_2gis.writer import get_writer


def yes_no(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized not in {"yes", "no"}:
        raise argparse.ArgumentTypeError("expected yes or no")
    return normalized == "yes"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--url", required=True)
    parser.add_argument("-o", "--output-path", required=True)
    parser.add_argument("-f", "--format", choices=["json"], required=True)
    parser.add_argument("--parser.max-records", dest="max_records", type=int, default=5)
    parser.add_argument("--chrome.binary_path", dest="binary_path")
    parser.add_argument("--chrome.headless", dest="headless", type=yes_no, default=True)
    parser.add_argument("--chrome.silent-browser", dest="silent_browser", type=yes_no, default=True)
    return parser.parse_args()


def patch_chrome_launch_flags():
    """Add the Linux flags proven necessary for the snap Chromium binary."""
    if os.name == "nt":
        return lambda: None

    original_popen = chrome_browser.subprocess.Popen

    def popen(command, *popen_args, **popen_kwargs):
        if isinstance(command, (list, tuple)) and any(
            str(argument).startswith("--remote-debugging-port=")
            for argument in command
        ):
            command = list(command)
            for flag in ("--no-zygote", "--disable-dev-shm-usage"):
                if flag not in command:
                    command.append(flag)
        return original_popen(command, *popen_args, **popen_kwargs)

    chrome_browser.subprocess.Popen = popen

    def restore() -> None:
        chrome_browser.subprocess.Popen = original_popen

    return restore


def extract_card_initial_state(body: str, expected_id: str = "") -> dict | None:
    match = re.search(r"var initialState = JSON\.parse\('((?:\\.|[^'])*)'\);", body)
    if not match:
        return None
    try:
        state_json = ast.literal_eval("'" + match.group(1) + "'")
        state = json.loads(state_json)
    except (ValueError, SyntaxError, json.JSONDecodeError):
        return None

    profiles = state.get("data", {}).get("entity", {}).get("profile", {})
    if not isinstance(profiles, dict):
        return None
    profile = profiles.get(expected_id)
    if profile is None and len(profiles) == 1:
        profile = next(iter(profiles.values()))
    data = profile.get("data") if isinstance(profile, dict) else None
    return data if isinstance(data, dict) and data.get("id") else None


def direct_http_parse(
    url: str,
    output_path: str,
    file_format: str,
    writer_config,
    max_records: int,
    trace,
) -> int:
    """Read 2GIS SSR search/card pages without waiting for CDP navigation."""
    headers = {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9",
        "Cookie": "dg5_museum_accept=true",
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) "
            "AppleWebKit/537.36 Chrome/131 Safari/537.36"
        ),
    }

    def fetch_html(page_url: str, referer: str = "") -> str:
        request_headers = dict(headers)
        if referer:
            request_headers["Referer"] = referer
        request = urllib.request.Request(page_url, headers=request_headers)
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status != 200:
                raise RuntimeError(f"HTTP {response.status}")
            return response.read().decode("utf-8", errors="replace")

    try:
        trace("starting direct 2GIS SSR search")
        search_body = fetch_html(url)
        links: list[str] = []
        for href in re.findall(r"""href=["']([^"']+)["']""", search_body):
            href = html.unescape(href)
            if not re.search(r"/(?:firm|station)/[^/?#]+(?:[/?#]|$)", href):
                continue
            card_url = urljoin(url, href)
            if card_url not in links:
                links.append(card_url)
        trace(f"direct 2GIS SSR links: {len(links)}")
        if not links:
            return 0

        written = 0
        with get_writer(output_path, file_format, writer_config) as writer:
            for card_url in links[:max_records]:
                try:
                    card_body = fetch_html(card_url, referer=url)
                    card_id_match = re.search(
                        r"/(?:firm|station)/([^/?#]+)", card_url
                    )
                    card_id = card_id_match.group(1) if card_id_match else ""
                    card_data = extract_card_initial_state(card_body, card_id)
                    if not card_data:
                        trace(f"direct 2GIS card has no profile data: {card_url}")
                        continue
                    writer.write({
                        "meta": {"code": 200},
                        "result": {"items": [card_data]},
                    })
                    written += 1
                    trace(
                        "direct 2GIS card written: "
                        f"id={card_data.get('id')} "
                        f"name={card_data.get('name', '')[:120]}"
                    )
                except Exception as error:
                    trace(f"direct 2GIS card failed: {card_url}: {error}")
        return written
    except Exception as error:
        trace(f"direct 2GIS SSR search failed: {error}")
        return 0


def main() -> None:
    args = parse_args()
    started_at = time.monotonic()

    def trace(message: str) -> None:
        elapsed = time.monotonic() - started_at
        print(f"[parser2gis +{elapsed:.1f}s] {message}", file=sys.stderr, flush=True)

    chrome_options = {
        "headless": args.headless,
        "silent_browser": args.silent_browser,
    }
    if args.binary_path:
        chrome_options["binary_path"] = args.binary_path

    config = Configuration(
        chrome=chrome_options,
        parser={"max_records": args.max_records},
    )

    restore_chrome_flags = patch_chrome_launch_flags()
    try:
        direct_count = direct_http_parse(
            args.url,
            args.output_path,
            args.format,
            config.writer,
            args.max_records,
            trace,
        )
        if direct_count:
            trace(f"direct 2GIS SSR parse finished: records={direct_count}")
            return
        trace("direct 2GIS SSR returned no records; falling back to ChromeRemote")
        trace("starting writer")
        with get_writer(args.output_path, args.format, config.writer) as writer:
            trace("starting ChromeRemote")
            with get_parser(
                args.url,
                chrome_options=config.chrome,
                parser_options=config.parser,
            ) as parser:
                trace("ChromeRemote connected")
                def wait_requests_finished():
                    # The upstream implementation evaluates window.openHTTPs
                    # through CDP. A permanently pending 2GIS XHR can block the
                    # CDP call itself, so its timeout decorator cannot interrupt
                    # it. Navigation has already completed and the DOM links are
                    # available, so continue without waiting for every XHR.
                    trace("skipping page XHR wait; reading loaded DOM")
                    return True

                parser._wait_requests_finished = wait_requests_finished

                last_document = None
                initial_item_responses = 0
                # Wait for the complete requested batch. The previous hard
                # cap of five made every repeated search exhaust the same
                # five companies and hide the rest of the 2GIS results.
                target_link_count = max(1, args.max_records)
                pending_card_url = None

                def get_links():
                    nonlocal initial_item_responses
                    trace("reading result links from DOM")
                    document = parser._chrome_remote.get_document()
                    result = document.search(
                        lambda node: (
                            node.local_name == "a"
                            and "href" in node.attributes
                            and re.search(
                                r"/(?:firm|station)/[^/?#]+(?:[/?#]|$)",
                                node.attributes["href"],
                            ) is not None
                        )
                    )
                    if len(result) < target_link_count:
                        deadline = time.monotonic() + 10
                        while len(result) < target_link_count and time.monotonic() < deadline:
                            trace(
                                f"result links still loading: {len(result)}/"
                                f"{target_link_count}"
                            )
                            time.sleep(0.5)
                            trace("reading result links from DOM")
                            document = parser._chrome_remote.get_document()
                            result = document.search(
                                lambda node: (
                                    node.local_name == "a"
                                    and "href" in node.attributes
                                    and re.search(
                                        r"/(?:firm|station)/[^/?#]+(?:[/?#]|$)",
                                        node.attributes["href"],
                                    ) is not None
                                )
                            )
                    trace(f"result links read: {len(result)}")
                    for index, node in enumerate(result[:args.max_records], start=1):
                        trace(
                            f"result link {index}: "
                            f"{node.attributes.get('href', '')[:300]}"
                        )
                    responses = parser._chrome_remote.get_responses()
                    api_responses = [
                        response
                        for response in responses
                        if "api.2gis." in response.get("url", "")
                    ]
                    api_status_counts = Counter(
                        str(response.get("status", "unknown"))
                        for response in api_responses
                    )
                    trace(
                        f"captured 2GIS API responses: {len(api_responses)}; "
                        f"statuses: {dict(api_status_counts)}"
                    )
                    for index, response in enumerate(api_responses[:20], start=1):
                        trace(
                            f"2GIS API response {index}: "
                            f"status={response.get('status', 'unknown')} "
                            f"url={response.get('url', '')[:240]}"
                        )
                    item_responses = [
                        response
                        for response in responses
                        if "/items/byid" in response.get("url", "")
                    ]
                    initial_item_responses = len(item_responses)
                    status_counts = Counter(
                        str(response.get("status", "unknown"))
                        for response in item_responses
                    )
                    trace(
                        f"captured item responses: {initial_item_responses}; "
                        f"statuses: {dict(status_counts)}"
                    )
                    if not result and last_document is not None:
                        anchors = last_document.search(
                            lambda node: node.local_name == "a" and "href" in node.attributes
                        )
                        samples = [
                            node.attributes["href"][:180]
                            for node in anchors[:10]
                        ]
                        trace(f"all DOM anchors: {len(anchors)}; samples: {samples}")
                    return result

                parser._get_links = get_links

                original_get_document = parser._chrome_remote.get_document

                def get_document(full=True):
                    nonlocal last_document
                    trace(f"requesting DOM document (full={full})")
                    result = original_get_document(full=full)
                    last_document = result
                    trace("DOM document received")
                    return result

                parser._chrome_remote.get_document = get_document

                # Keep one slow or missing item response from multiplying into minutes:
                # the upstream parser retries each item three times with a 30-second
                # wait, and max_records only limits successful records.
                original_wait_response = parser._chrome_remote.wait_response

                def load_card_response(card_url):
                    trace(f"reading card HTML from 2GIS: url={card_url[:240]}")
                    request = urllib.request.Request(
                        card_url,
                        headers={
                            "Accept": "text/html,application/xhtml+xml",
                            "Accept-Language": "ru-RU,ru;q=0.9",
                            "Cookie": "dg5_museum_accept=true",
                            "User-Agent": (
                                "Mozilla/5.0 (X11; Linux x86_64) "
                                "AppleWebKit/537.36 Chrome/131 Safari/537.36"
                            ),
                        },
                    )
                    with urllib.request.urlopen(request, timeout=10) as card_response:
                        body = card_response.read().decode("utf-8", errors="replace")
                    trace(
                        f"2GIS card HTML fetched: bytes={len(body)} "
                        f"has_initialState={'var initialState' in body}"
                    )
                    card_id_match = re.search(r"/(?:firm|station)/([^/?#]+)", card_url)
                    card_id = card_id_match.group(1) if card_id_match else ""
                    card_data = extract_card_initial_state(body, card_id)
                    if not card_data:
                        trace("card HTML initialState not found")
                        return None
                    trace(
                        "using card HTML initialState as item response: "
                        f"id={card_data.get('id')} "
                        f"name={card_data.get('name', '')[:120]}"
                    )
                    return {
                        "status": 200,
                        "url": card_url,
                        "_fallback_body": json.dumps(
                            {
                                "meta": {"code": 200},
                                "result": {"items": [card_data]},
                            },
                            ensure_ascii=False,
                        ),
                    }

                def wait_response(pattern):
                    nonlocal pending_card_url
                    card_url = pending_card_url
                    pending_card_url = None
                    if card_url:
                        try:
                            result = load_card_response(card_url)
                            if result:
                                return result
                        except Exception as error:
                            trace(f"direct card HTML request failed: {error}")
                    trace("waiting for item response")
                    result = original_wait_response(
                        pattern,
                        timeout=5,
                        throw_exception=False,
                    )
                    if result:
                        trace(
                            "item response received: "
                            f"status={result.get('status', 'unknown')} "
                            f"url={result.get('url', '')[:180]}"
                        )
                    else:
                        trace("item response received: false")
                        current_url = ""
                        try:
                            responses = parser._chrome_remote.get_responses()
                            api_responses = [
                                response
                                for response in responses
                                if "api.2gis." in response.get("url", "")
                            ]
                            trace(
                                f"post-click 2GIS API responses: {len(api_responses)}"
                            )
                            for index, response in enumerate(api_responses[-20:], start=1):
                                trace(
                                    f"post-click API response {index}: "
                                    f"status={response.get('status', 'unknown')} "
                                    f"url={response.get('url', '')[:240]}"
                                )
                            card_responses = []
                            response_deadline = time.monotonic() + 10
                            while not card_responses and time.monotonic() < response_deadline:
                                card_responses = [
                                    response
                                    for response in parser._chrome_remote.get_responses()
                                    if re.search(
                                        r"/(?:firm|station)/[^/?#]+(?:[/?#]|$)",
                                        response.get("url", ""),
                                    )
                                    and response.get("status", 0) == 200
                                ]
                                if not card_responses:
                                    time.sleep(0.5)
                            for response in reversed(card_responses):
                                current_url = response.get("url", "")
                                card_id_match = re.search(
                                    r"/(?:firm|station)/([^/?#]+)",
                                    current_url,
                                )
                                card_id = card_id_match.group(1) if card_id_match else ""
                                card_data = extract_card_initial_state(body, card_id)
                                if card_data:
                                    return {
                                        "status": 200,
                                        "url": current_url,
                                        "_fallback_body": json.dumps(
                                            {
                                                "meta": {"code": 200},
                                                "result": {"items": [card_data]},
                                            },
                                            ensure_ascii=False,
                                        ),
                                    }
                            trace("card HTML initialState not found")
                        except Exception as error:
                            trace(f"post-click response inspection failed: {error}")
                    return result

                parser._chrome_remote.wait_response = wait_response

                original_get_response_body = parser._chrome_remote.get_response_body

                def get_response_body(response, timeout=10):
                    fallback_body = response.get("_fallback_body")
                    if fallback_body is not None:
                        trace("reading item response body from 2GIS card initialState")
                        return fallback_body
                    trace("reading item response body")
                    body = original_get_response_body(response, timeout=timeout)
                    try:
                        parsed_body = json.loads(body)
                        result = parsed_body.get("result", {})
                        item_count = len(result.get("items", []))
                        trace(
                            f"item response body parsed: bytes={len(body)} "
                            f"items={item_count}"
                        )
                    except (TypeError, json.JSONDecodeError, AttributeError):
                        trace(f"item response body is not valid JSON: bytes={len(body)}")
                    return body

                parser._chrome_remote.get_response_body = get_response_body

                original_navigate = parser._chrome_remote.navigate
                
                def navigate(url, referer="", timeout=60):
                    trace("starting 2GIS navigation")
                    result = original_navigate(
                        url,
                        referer=referer,
                        timeout=min(timeout, 30),
                    )
                    trace("2GIS navigation finished")
                    return result

                parser._chrome_remote.navigate = navigate

                original_perform_click = parser._chrome_remote.perform_click
                museum_cookie_set = False

                def set_museum_cookie():
                    nonlocal museum_cookie_set
                    if museum_cookie_set:
                        return
                    trace("setting 2GIS museum acceptance cookie")
                    cookie_result = parser._chrome_remote._chrome_tab.Network.setCookie(
                        name="dg5_museum_accept",
                        value="true",
                        url="https://2gis.ru/",
                        path="/",
                    )
                    if not cookie_result.get("success", False):
                        raise RuntimeError("Не удалось установить cookie принятия риска 2ГИС")
                    museum_cookie_set = True
                    trace("2GIS museum acceptance cookie set")

                def perform_click(node, timeout=None):
                    nonlocal pending_card_url
                    href = node.attributes.get("href", "")
                    if re.search(r"/(?:firm|station)/[^/?#]+(?:[/?#]|$)", href):
                        set_museum_cookie()
                        pending_card_url = href if href.startswith("http") else f"https://2gis.ru{href}"
                        trace(f"loading result card data: {pending_card_url[:240]}")
                        return None
                    return original_perform_click(node, timeout=timeout)

                parser._chrome_remote.perform_click = perform_click
                set_museum_cookie()
                trace("starting parser.parse")
                parser.parse(writer)
                trace("parser.parse finished")
                browser_process = parser._chrome_remote._chrome_browser._proc
            trace("ChromeRemote closed")
            if browser_process.poll() is None:
                trace("Chrome process still running after parser close")
            else:
                trace(f"Chrome process exited: code={browser_process.returncode}")

        trace("writer closed")
        with open(args.output_path, "r", encoding="utf-8-sig") as output_file:
            output_records = json.load(output_file)
        if not isinstance(output_records, list):
            raise RuntimeError("Parser2GIS output is not a JSON array")
        trace(f"output JSON records: {len(output_records)}")
    finally:
        restore_chrome_flags()


if __name__ == "__main__":
    main()