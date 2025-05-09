# Development stage
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 