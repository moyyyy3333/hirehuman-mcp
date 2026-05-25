FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY mcp-server.js .
ENV TRANSPORT=http
EXPOSE 8080
CMD ["node", "mcp-server.js", "--http"]
