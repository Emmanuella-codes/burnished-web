# Use Node 23 as the base image
FROM node:23-alpine

# Set working directory
WORKDIR /app

# Copy only the package files first (for caching)
COPY package.json yarn.lock ./

# Install dependencies using Yarn
RUN yarn install --frozen-lockfile

# Copy the rest of project files
COPY . .

# Build the NestJS project with verbose output
RUN yarn build

# Verify the build output exists
RUN ls -la dist/ && test -f dist/main.js || (echo "Build failed: dist/main.js not found" && exit 1)

# Expose the app port
EXPOSE 4006

# Run the app
CMD ["yarn", "start:prod"]
