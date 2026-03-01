from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        url = query.get("url", [None])[0]

        if not url:
            self._json_response(400, {"error": "Missing url parameter"})
            return

        try:
            import yt_dlp

            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "format": "best[ext=mp4]/best",
                "no_check_certificates": True,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            video_url = info.get("url", "")

            # If no direct URL (e.g. DASH manifest), try requested_formats
            if not video_url:
                formats = info.get("requested_formats", [])
                for f in formats:
                    if f.get("vcodec") != "none" and f.get("acodec") != "none":
                        video_url = f.get("url", "")
                        break
                if not video_url and formats:
                    video_url = formats[0].get("url", "")

            self._json_response(200, {
                "title": info.get("title", ""),
                "duration": info.get("duration", 0),
                "thumbnail": info.get("thumbnail", ""),
                "videoId": info.get("id", ""),
                "videoUrl": video_url,
            })

        except Exception as e:
            self._json_response(500, {"error": str(e)})

    def _json_response(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
