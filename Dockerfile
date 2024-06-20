FROM node:latest
WORKDIR /app
ADD . .
RUN npm install

RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    xvfb \
    procps \
    uuid-runtime

RUN npm install puppeteer

RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt install -y --fix-missing ./google-chrome-stable_current_amd64.deb

COPY cleanup.sh /app/cleanup.sh

WORKDIR /app

ENTRYPOINT ["sh", "/app/cleanup.sh"]

CMD node server.js
