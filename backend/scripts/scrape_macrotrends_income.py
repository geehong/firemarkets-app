#!/usr/bin/env python3
import asyncio
import json
import re
import sys

import httpx
from bs4 import BeautifulSoup

URL = "https://www.macrotrends.net/stocks/charts/AAPL/apple/income-statement"

pattern = re.compile(r"var\s+originalData\s*=\s*(\[\{[\s\S]*?\}\]);", re.MULTILINE)


def extract_original_data_json(text: str):
	m = pattern.search(text)
	if not m:
		return None
	return json.loads(m.group(1))


def strip_html(text: str) -> str:
	"""Remove HTML tags from a small HTML snippet safely."""
	if not text:
		return ""
	return BeautifulSoup(text, "html.parser").get_text(strip=True)


def normalize_original_data(records):
	"""Remove HTML fields and cast numeric strings to numbers when possible."""
	normalized = []
	for rec in records:
		new_rec = {}
		for key, value in rec.items():
			if key == "popup_icon":
				# drop HTML-heavy field entirely
				continue
			if key == "field_name":
				new_rec[key] = strip_html(value)
				continue
			# Try to cast numeric strings like "391035.00000" to float
			if isinstance(value, str):
				v = value.strip()
				if v == "":
					new_rec[key] = None
					continue
				try:
					# Prefer int if looks like integer after removing trailing zeros
					f = float(v)
					if f.is_integer():
						new_rec[key] = int(f)
					else:
						new_rec[key] = f
					continue
				except ValueError:
					pass
			# Keep as-is for non-numeric or non-str
			new_rec[key] = value
		normalized.append(new_rec)
	return normalized


async def main(url: str = URL):
	async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Accept-Language": "en-US,en;q=0.9",
	}) as client:
		resp = await client.get(url)
		resp.raise_for_status()
		soup = BeautifulSoup(resp.content, "html.parser")
		for s in soup.find_all("script"):
			content = (s.string or s.get_text() or "")
			if "var originalData" in content:
				data = extract_original_data_json(content)
				if data is None:
					print("{}", end="")
					return
				clean = normalize_original_data(data)
				print(json.dumps(clean, ensure_ascii=False))
				return
		print("{}", end="")


if __name__ == "__main__":
	url = sys.argv[1] if len(sys.argv) > 1 else URL
	asyncio.run(main(url))







