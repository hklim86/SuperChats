FROM node:latest
WORKDIR /app
ADD . .
RUN npm install
# #RUN npm install -g puppeteer
# RUN apt-get update
# RUN apt-get install chromium-y
# RUN apt-get install libx11-xcb1 libxcomposite1 libasound2 libatk1.0-0 libatk-bridge2.0-0 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 
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
