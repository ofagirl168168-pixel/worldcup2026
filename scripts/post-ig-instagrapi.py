#!/usr/bin/env python3
"""
post-ig-instagrapi.py
透過 instagrapi 發 IG 限動（含 link sticker），取代官方 Graph API 那條
無 link sticker 的線。

GH Actions 從 IG_SESSION_B64 還原 session，不需密碼。

用法：
  py scripts/post-ig-instagrapi.py <image_path> <link_url> [caption]

env：
  IG_SESSION_B64  base64 encoded session.json
  TELEGRAM_BOT_TOKEN  (option) — challenge required 時通知
  TELEGRAM_CHAT_ID    (option)

exit codes：
  0  成功，stdout 印 ig_media_id
  1  一般失敗
  2  session 失效（要求重新跑 setup）
  3  IG 風控（challenge required，要本機重登）
"""

import base64
import json
import os
import sys
import time
import random
from pathlib import Path

try:
    from instagrapi import Client
    from instagrapi.exceptions import (
        LoginRequired,
        ChallengeRequired,
        RateLimitError,
        ClientForbiddenError,
    )
except ImportError:
    print("ERR: missing instagrapi. pip install instagrapi", file=sys.stderr)
    sys.exit(1)


SESSION_B64 = os.environ.get("IG_SESSION_B64")
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TG_CHAT = os.environ.get("TELEGRAM_CHAT_ID")
SESSION_TMP = Path("/tmp/ig-session.json") if os.name != "nt" else Path(os.environ.get("TEMP", ".")) / "ig-session.json"


def notify_tg(msg: str) -> None:
    if not TG_TOKEN or not TG_CHAT:
        return
    try:
        import urllib.request
        import urllib.parse
        data = urllib.parse.urlencode({"chat_id": TG_CHAT, "text": msg}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            data=data,
        )
        urllib.request.urlopen(req, timeout=10).read()
    except Exception:
        pass


def load_client() -> Client:
    if not SESSION_B64:
        print("ERR: IG_SESSION_B64 not set", file=sys.stderr)
        sys.exit(1)
    session = json.loads(base64.b64decode(SESSION_B64))
    cl = Client()
    cl.set_settings(session)
    try:
        cl.get_timeline_feed()  # touch any endpoint to verify session
    except LoginRequired:
        print("ERR: session expired", file=sys.stderr)
        notify_tg("⚠️ IG session 失效，請本機重跑 setup-ig-instagrapi.py 拿新 session 並更新 IG_SESSION_B64")
        sys.exit(2)
    except ChallengeRequired as e:
        print(f"ERR: challenge required: {e}", file=sys.stderr)
        notify_tg(f"⚠️ IG 要求驗證身分（challenge_required）— 開 IG App 確認後重跑 setup")
        sys.exit(3)
    return cl


def main() -> None:
    if len(sys.argv) < 3:
        print("用法：py post-ig-instagrapi.py <image_path> <link_url> [caption]", file=sys.stderr)
        sys.exit(1)

    image_path = Path(sys.argv[1])
    link_url = sys.argv[2]
    caption = sys.argv[3] if len(sys.argv) > 3 else ""

    if not image_path.is_file():
        print(f"ERR: image not found {image_path}", file=sys.stderr)
        sys.exit(1)

    cl = load_client()

    # 模擬人類節奏：1-3 秒隨機 jitter
    time.sleep(random.uniform(1.0, 3.0))

    try:
        # photo_upload_to_story 支援 links 參數加 link sticker（一鍵點進去網頁）
        media = cl.photo_upload_to_story(
            path=str(image_path),
            caption=caption,
            links=[{"webUri": link_url}] if link_url else None,
        )
        print(media.id)  # 印 ig_media_id 給呼叫者用
    except RateLimitError as e:
        print(f"ERR: rate limit: {e}", file=sys.stderr)
        sys.exit(1)
    except ChallengeRequired as e:
        print(f"ERR: challenge mid-publish: {e}", file=sys.stderr)
        notify_tg(f"⚠️ IG 發限動中途要驗證身分 — 重跑 setup 後再試")
        sys.exit(3)
    except ClientForbiddenError as e:
        print(f"ERR: forbidden: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERR: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
