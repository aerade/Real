#!/usr/bin/env python3
"""Run Parser2GIS without blocking on a permanently pending background request."""

from __future__ import annotations

import argparse
import os
import re
import sys
import time

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
                    trace(f"result links read: {len(result)}")
                    responses = parser._chrome_remote.get_responses()
                    initial_item_responses = sum(
                        1
                        for response in responses
                        if "/items/byid" in response.get("url", "")
                    )
                    trace(f"captured item responses: {initial_item_responses}")
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

                def wait_response(pattern):
                    trace("waiting for item response")
                    result = original_wait_response(
                        pattern,
                        timeout=5,
                        throw_exception=False,
                    )
                    trace(f"item response received: {bool(result)}")
                    return result

                parser._chrome_remote.wait_response = wait_response

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

                def perform_click(node, timeout=None):
                    href = node.attributes.get("href", "")
                    if re.search(r"/(?:firm|station)/[^/?#]+(?:[/?#]|$)", href):
                        trace("using captured item response; skipping card navigation")
                        return None
                    return original_perform_click(node, timeout=timeout)

                parser._chrome_remote.perform_click = perform_click
                trace("starting parser.parse")
                parser.parse(writer)
                trace("parser.parse finished")
    finally:
        restore_chrome_flags()


if __name__ == "__main__":
    main()