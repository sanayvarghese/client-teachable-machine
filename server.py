from http.server import HTTPServer, BaseHTTPRequestHandler, SimpleHTTPRequestHandler
import logging
import ssl
import ngrok
import threading
import yaml
import socket
# ANSI escape codes for colors
COLOR_RESET = "\033[0m"
COLOR_RED = "\033[91m"
COLOR_GREEN = "\033[92m"
COLOR_YELLOW = "\033[93m"
COLOR_CYAN = "\033[96m"



# Custom log level colors
LOG_LEVEL_COLORS = {
    'DEBUG': COLOR_CYAN,
    'INFO': COLOR_GREEN,
    'WARNING': COLOR_YELLOW,
    'ERROR': COLOR_RED,
    'CRITICAL': COLOR_RED,
}
class ColoredFormatter(logging.Formatter):
    def format(self, record):
        log_message = super(ColoredFormatter, self).format(record)
        log_level_color = LOG_LEVEL_COLORS.get(record.levelname, COLOR_RESET)
        return f"{log_level_color}{log_message}{COLOR_RESET}"
def setup_colorized_logging():
    formatter = ColoredFormatter('%(message)s')
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    logger = logging.getLogger()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def get_private_ipv4():
    print(f"{COLOR_CYAN}Getting Private IP...{COLOR_RESET}")
    try:
        # Create a socket and connect to an external server (here, using Google's public DNS server)
        # This is done to get the local IP address used for the connection
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except socket.error as e:
        logging.warning("When accessing from other device on same network remember to change localhost to your machine ip address")
        return "localhost"

ngrok_url = ""

class Guider(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(302)
        self.send_header("Location", ngrok_url)
        self.end_headers()
        self.wfile.write(b"")

class ClientPage(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def get_ngrok_auth_token():
    with open("config.yml", "r") as config_file:
        config_data = yaml.safe_load(config_file)
        return config_data.get("NGROK_AUTH_TOKEN", None)

def run_servers():
    global ngrok_url
    # Turn off logging for Ngrok
    logging.getLogger("ngrok").setLevel(logging.WARNING)

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    ngrok_auth_token = get_ngrok_auth_token()
    ip = get_private_ipv4()
    print(f"{COLOR_CYAN}Starting Server....{COLOR_RESET}")
    logging.info("")

    try:
        server = HTTPServer(("0.0.0.0", 8000), ClientPage)
        if ngrok_auth_token:
            listener = ngrok.forward("localhost:8000", authtoken=ngrok_auth_token)
            ngrok_url = listener.url()

            # Start Guider server in a separate thread
            guider_server = HTTPServer(("0.0.0.0", 8001), Guider)
            guider_server_thread = threading.Thread(target=guider_server.serve_forever)
            guider_server_thread.start()

            print(f"For Visiting the app in devices with same network ---> {COLOR_GREEN}http://{ip}:{guider_server.server_port}{COLOR_RESET}")
            print("\t OR")
            print(f"Devices outside the network use ngrok url ---->  {COLOR_GREEN}{ngrok_url}{COLOR_RESET}")
            logging.info("")
            print(f"{COLOR_YELLOW}If you are loading  Loading the website if there is a blue button called  {COLOR_CYAN}Visit Site{COLOR_YELLOW}, Click On that!!{COLOR_RESET}")

        else:
            logging.error("Ngrok access token not found. Starting a local server with a self-signed certificate.")
            logging.info("")
            
            # Specify the paths to the self-signed certificate and private key
            certfile = "cert/server.crt"
            keyfile = "cert/server.key"

            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(certfile=certfile, keyfile=keyfile)
            
            server.socket = context.wrap_socket(server.socket, server_side=True)
            
            ngrok_url = f"https://{ip}:{server.server_port}"
            print(f"For Visiting the app in devices with same network ---->  {COLOR_GREEN}{ngrok_url}{COLOR_RESET}")

            # Start the local server
        logging.info("")
        print(f"{COLOR_RED}Press Ctrl + C to exit...{COLOR_RESET}")
        server.serve_forever()

        

    
    except KeyboardInterrupt:
        logging.error("Received Ctrl+C. Shutting down the servers.")
        if ngrok_auth_token:
            guider_server.shutdown()
            ngrok.disconnect(ngrok_url)
            ngrok.kill()
        else:
            server.shutdown()
        # sys.exit()
    except Exception as e:
        logging.error(e)
        

if __name__ == "__main__":
    setup_colorized_logging()
    run_servers()
