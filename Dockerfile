FROM node:14 as ts-remover
WORKDIR /usr/app

COPY src ./src
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
COPY yt-dlp ./

RUN npm install
RUN npm run build

FROM node:14 as app
WORKDIR /usr/app

COPY --from=ts-remover /usr/app/dist ./
COPY --from=ts-remover /usr/app/package.json ./
COPY --from=ts-remover /usr/app/yt-dlp ./

RUN npm install --only=production

FROM nikolaik/python-nodejs:python3.10-nodejs14
WORKDIR /usr/app

COPY --from=app /usr/app ./
USER 0
EXPOSE ${PORT}
CMD ["node", "index.js"]
