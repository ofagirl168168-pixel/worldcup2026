#!/usr/bin/env python3
"""
setup-ig-instagrapi.py
本機一次性執行 — 用 instagrapi 登入 IG，產 session 檔給 GH Actions 用。

用法：
  py -m pip install instagrapi
  py scripts/setup-ig-instagrapi.py

輸出：
  scripts/.ig-session.json   (本機保留，加進 .gitignore 不會上 git)
  base64 字串                (印在 console，複製貼到 GH Secret IG_SESSION_B64)

之後 workflow 從 IG_SESSION_B64 還原 session 直接登入，
不再需要密碼，也避免「異地登入」風控。
"""

import json
import base64
import os
import sys
from getpass import getpass
from pathlib import Path

try:
    from instagrapi import Client
    from instagrapi.exceptions import (
        BadPassword,
        LoginRequired,
        ChallengeRequired,
        TwoFactorRequired,
    )
except ImportError:
    print("❌ 缺 instagrapi。執行：py -m pip install instagrapi")
    sys.exit(1)


ROOT = Path(__file__).resolve().parent.parent
SESSION_PATH = ROOT / "scripts" / ".ig-session.json"


def main() -> None:
    print("=" * 60)
    print("IG instagrapi 一次性登入工具")
    print("=" * 60)
    print()

    username = input("IG username [168good236]: ").strip() or "168good236"
    password = getpass("IG password (輸入時不顯示): ").strip()
    if not password:
        print("❌ 密碼空白，中止")
        sys.exit(1)

    cl = Client()
    # 模擬 iPhone 不容易被擋
    cl.set_device({
        "app_version": "269.0.0.18.75",
        "android_version": 26,
        "android_release": "8.0.0",
        "dpi": "480dpi",
        "resolution": "1080x1920",
        "manufacturer": "Apple",
        "device": "iPhone13,3",
        "model": "iPhone 12 Pro",
        "cpu": "iPhone13,3",
        "version_code": "314665256",
    })
    cl.set_user_agent("Instagram 269.0.0.18.75 Android (26/8.0.0; 480dpi; 1080x1920; Apple; iPhone 12 Pro; iPhone13,3; iPhone13,3; en_US; 314665256)")

    print(f"\n→ 嘗試登入 {username}…")
    try:
        cl.login(username, password)
        print("✓ 登入成功（一次過）")
    except TwoFactorRequired:
        code = input("📱 IG 要 2FA 驗證碼（檢查 Authenticator App / 簡訊）：").strip()
        cl.login(username, password, verification_code=code)
        print("✓ 2FA 通過")
    except ChallengeRequired as e:
        print(f"⚠️  IG 要求驗證身分：{e}")
        print("  → 開 IG App 看通知 / Email / 簡訊")
        print("  → 按下「是、是我」確認後再重跑此腳本")
        sys.exit(2)
    except BadPassword:
        print("❌ 密碼錯誤")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 登入失敗：{type(e).__name__}: {e}")
        sys.exit(1)

    # 存 session
    SESSION_PATH.write_text(
        json.dumps(cl.get_settings(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n✓ session 已存：{SESSION_PATH}")

    # 印 base64 給使用者貼進 GH Secret
    session_bytes = SESSION_PATH.read_bytes()
    encoded = base64.b64encode(session_bytes).decode("ascii")
    print()
    print("=" * 60)
    print("複製下面整串（不含「─」分隔線）→ 存進 GH Secret: IG_SESSION_B64")
    print("=" * 60)
    print(encoded)
    print("=" * 60)
    print()
    print("提示：執行完先把 scripts/.ig-session.json 加進 .gitignore")
    print("（避免 session 被 commit 上 GitHub）")


if __name__ == "__main__":
    main()
