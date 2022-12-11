FROM node:lts-slim

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Install curl on lts-slim 
RUN apt-get update && apt-get install curl -y

RUN npm install

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

RUN useradd -r -u 1000 -g appuser appuser
USER appuser

# EXPOSE 8080
CMD [ "node", "index.mjs" ]
# ENTRYPOINT ["tail", "-f", "/dev/null"]
