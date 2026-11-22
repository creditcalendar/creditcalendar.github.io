"""Build and preview locally. Restart after editing source files."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from build import build, OUTPUT

if __name__ == '__main__':
    build()
    server = ThreadingHTTPServer(('127.0.0.1', 4000), partial(SimpleHTTPRequestHandler, directory=str(OUTPUT)))
    print('Preview: http://127.0.0.1:4000 (Ctrl+C to stop)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
