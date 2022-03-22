FROM node:13.13.0-alpine

WORKDIR /app

COPY . .

RUN apk add --no-cache bash

RUN wget -O /bin/wait-for-it.sh https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh

RUN chmod +x /bin/wait-for-it.sh

RUN npm install

CMD ["npm", "run", "subscribe"]
