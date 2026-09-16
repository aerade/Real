#!/usr/bin/env python3
"""Run Parser2GIS without blocking on a permanently pending background request."""

from __future__ import annotations

import argparse

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


def main() -> None:
    args = parse_args()
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

    with get_writer(args.output_path, args.format, config.writer) as writer:
        with get_parser(
            args.url,
            chrome_options=config.chrome,
            parser_options=config.parser,
        ) as parser:
            # The upstream parser waits up to two minutes for every 2GIS XHR.
            # Some VPS requests never close, although the result links are ready.
            original_wait = type(parser)._wait_requests_finished
            parser._wait_requests_finished = lambda: original_wait(
                parser,
                timeout=15,
                throw_exception=False,
            )

            # Keep one slow or missing item response from multiplying into minutes:
            # the upstream parser retries each item three times with a 30-second
            # wait, and max_records only limits successful records.
            original_wait_response = parser._chrome_remote.wait_response
            parser._chrome_remote.wait_response = lambda pattern: original_wait_response(
                pattern,
                timeout=5,
                throw_exception=False,
            )

            original_navigate = parser._chrome_remote.navigate
            parser._chrome_remote.navigate = lambda url, referer="", timeout=60: original_navigate(
                url,
                referer=referer,
                timeout=min(timeout, 30),
            )
            parser.parse(writer)


if __name__ == "__main__":
    main()