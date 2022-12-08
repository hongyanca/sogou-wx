FROM node:lts-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

#alpine linux
#RUN apk --no-cache add curl

RUN npm install

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

# EXPOSE 8080
#CMD [ "node", "index.mjs" ]
ENTRYPOINT ["tail", "-f", "/dev/null"]
