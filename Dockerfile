FROM node:14 as ts-remover
WORKDIR /usr/app

COPY src ./src
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./

RUN npm install
RUN npm run build

FROM node:14 as app
WORKDIR /usr/app

COPY --from=ts-remover /usr/app/dist ./
COPY --from=ts-remover /usr/app/package.json ./

RUN npm install --only=production

FROM ubuntu:20.04 as platform

RUN apt update
# Install node v16
RUN apt install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt install -y nodejs
# Install python 3.10
RUN apt install -y software-properties-common
RUN add-apt-repository ppa:deadsnakes/ppa
RUN apt update
RUN apt install -y python3.10
RUN apt install -y python3-pip
# Install yt-dlp
RUN apt install -y ffmpeg
RUN pip install https://github.com/yt-dlp/yt-dlp/archive/master.tar.gz

FROM platform
WORKDIR /usr/app

COPY --from=app /usr/app ./
USER 0
EXPOSE ${PORT}
CMD ["node", "index.js"]
