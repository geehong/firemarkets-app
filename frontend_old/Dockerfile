FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

EXPOSE 80

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "80"] 