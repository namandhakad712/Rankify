# Deployment Guide - Advanced Diagram Detection System

This guide covers various deployment options for the Advanced Diagram Detection System, from development to production environments.

## 🚀 Quick Start Deployment

### Local Development

```bash
# Clone and setup
git clone https://github.com/your-org/advanced-diagram-detection.git
cd advanced-diagram-detection
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your Gemini API key

# Start development server
npm run dev
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🐳 Docker Deployment

### Single Container Deployment

```bash
# Build and run with Docker
docker build -t advanced-diagram-detection .
docker run -p 3000:3000 \
  -e NUXT_PUBLIC_GEMINI_API_KEY=your_api_key \
  advanced-diagram-detection
```

### Docker Compose Deployment

```bash
# Development environment
docker-compose --profile dev up --build

# Production environment
docker-compose --profile production up --build

# Full stack with monitoring
docker-compose --profile production --profile monitoring up --build
```

### Docker Environment Variables

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  app:
    environment:
      - NUXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key
      - NUXT_PUBLIC_CONFIDENCE_THRESHOLD=0.8
      - NUXT_PUBLIC_ENABLE_DEBUG_MODE=false
```

## ☁️ Cloud Deployment

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Environment Variables**
   ```bash
   vercel env add NUXT_PUBLIC_GEMINI_API_KEY
   vercel env add NUXT_PUBLIC_CONFIDENCE_THRESHOLD
   ```

4. **Vercel Configuration** (`vercel.json`)
   ```json
   {
     "builds": [
       {
         "src": "nuxt.config.ts",
         "use": "@nuxtjs/vercel-builder"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "/api/$1"
       },
       {
         "src": "/(.*)",
         "dest": "/$1"
       }
     ],
     "env": {
       "NUXT_PUBLIC_GEMINI_API_KEY": "@gemini-api-key"
     }
   }
   ```

### Netlify Deployment

1. **Build Configuration** (`netlify.toml`)
   ```toml
   [build]
     command = "npm run build"
     publish = ".output/public"

   [build.environment]
     NODE_VERSION = "18"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Environment Variables**
   - Set in Netlify dashboard under Site settings > Environment variables
   - Add `NUXT_PUBLIC_GEMINI_API_KEY`

### AWS Deployment

#### AWS Lambda + CloudFront

1. **Install AWS CLI and configure**
   ```bash
   aws configure
   ```

2. **Deploy with Serverless Framework**
   ```yaml
   # serverless.yml
   service: advanced-diagram-detection
   
   provider:
     name: aws
     runtime: nodejs18.x
     region: us-east-1
     environment:
       NUXT_PUBLIC_GEMINI_API_KEY: ${env:GEMINI_API_KEY}
   
   functions:
     nuxt:
       handler: .output/server/index.handler
       events:
         - http:
             path: /{proxy+}
             method: ANY
   ```

3. **Deploy**
   ```bash
   npx serverless deploy
   ```

#### AWS ECS with Fargate

1. **Create ECS Task Definition**
   ```json
   {
     "family": "advanced-diagram-detection",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "app",
         "image": "your-account.dkr.ecr.region.amazonaws.com/advanced-diagram-detection:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NUXT_PUBLIC_GEMINI_API_KEY",
             "value": "your_api_key"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/advanced-diagram-detection",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

### Google Cloud Platform

#### Cloud Run Deployment

1. **Build and push to Container Registry**
   ```bash
   # Build image
   docker build -t gcr.io/your-project/advanced-diagram-detection .
   
   # Push to registry
   docker push gcr.io/your-project/advanced-diagram-detection
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy advanced-diagram-detection \
     --image gcr.io/your-project/advanced-diagram-detection \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NUXT_PUBLIC_GEMINI_API_KEY=your_api_key
   ```

#### App Engine Deployment

1. **App Engine Configuration** (`app.yaml`)
   ```yaml
   runtime: nodejs18
   
   env_variables:
     NUXT_PUBLIC_GEMINI_API_KEY: your_api_key
     NODE_ENV: production
   
   automatic_scaling:
     min_instances: 1
     max_instances: 10
   ```

2. **Deploy**
   ```bash
   gcloud app deploy
   ```

### Microsoft Azure

#### Azure Container Instances

```bash
# Create resource group
az group create --name diagram-detection-rg --location eastus

# Create container instance
az container create \
  --resource-group diagram-detection-rg \
  --name advanced-diagram-detection \
  --image your-registry/advanced-diagram-detection:latest \
  --dns-name-label diagram-detection \
  --ports 3000 \
  --environment-variables NUXT_PUBLIC_GEMINI_API_KEY=your_api_key
```

#### Azure App Service

1. **Create App Service Plan**
   ```bash
   az appservice plan create \
     --name diagram-detection-plan \
     --resource-group diagram-detection-rg \
     --sku B1 \
     --is-linux
   ```

2. **Create Web App**
   ```bash
   az webapp create \
     --resource-group diagram-detection-rg \
     --plan diagram-detection-plan \
     --name advanced-diagram-detection \
     --deployment-container-image-name your-registry/advanced-diagram-detection:latest
   ```

## 🔧 Environment Configuration

### Production Environment Variables

```bash
# Required
NUXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Optional but recommended
NODE_ENV=production
NUXT_PUBLIC_ENABLE_DEBUG_MODE=false
NUXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NUXT_PUBLIC_LOG_LEVEL=error

# Performance tuning
NUXT_PUBLIC_CONFIDENCE_THRESHOLD=0.8
NUXT_PUBLIC_BATCH_SIZE=3
NUXT_PUBLIC_API_TIMEOUT=45000
NUXT_PUBLIC_MAX_RETRIES=2

# Security
NUXT_SECRET_KEY=your_secret_key
NUXT_SESSION_SECRET=your_session_secret
```

### Environment-Specific Configurations

#### Development
```bash
NODE_ENV=development
NUXT_PUBLIC_ENABLE_DEBUG_MODE=true
NUXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NUXT_PUBLIC_LOG_LEVEL=debug
```

#### Staging
```bash
NODE_ENV=staging
NUXT_PUBLIC_ENABLE_DEBUG_MODE=false
NUXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NUXT_PUBLIC_LOG_LEVEL=info
```

#### Production
```bash
NODE_ENV=production
NUXT_PUBLIC_ENABLE_DEBUG_MODE=false
NUXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
NUXT_PUBLIC_LOG_LEVEL=error
```

## 🔒 Security Configuration

### SSL/TLS Setup

#### Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers

Add to your reverse proxy or CDN:

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## 📊 Monitoring and Logging

### Application Monitoring

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'advanced-diagram-detection'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Advanced Diagram Detection Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

### Log Management

#### Structured Logging
```typescript
// utils/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  },
  error: (message: string, error?: Error, meta?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  }
}
```

#### Log Aggregation with ELK Stack
```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

## 🚀 Performance Optimization

### CDN Configuration

#### CloudFlare Setup
```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const cache = caches.default
  const cacheKey = new Request(request.url, request)
  
  // Check cache first
  let response = await cache.match(cacheKey)
  
  if (!response) {
    // Fetch from origin
    response = await fetch(request)
    
    // Cache static assets
    if (request.url.includes('/assets/')) {
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=86400')
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
      
      event.waitUntil(cache.put(cacheKey, response.clone()))
    }
  }
  
  return response
}
```

### Database Optimization

#### IndexedDB Performance
```typescript
// utils/database/performance.ts
export class DatabasePerformance {
  private static instance: DatabasePerformance
  private cache = new Map()
  
  static getInstance(): DatabasePerformance {
    if (!DatabasePerformance.instance) {
      DatabasePerformance.instance = new DatabasePerformance()
    }
    return DatabasePerformance.instance
  }
  
  async getCachedData(key: string, fetcher: () => Promise<any>): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }
    
    const data = await fetcher()
    this.cache.set(key, data)
    
    // Auto-expire cache after 5 minutes
    setTimeout(() => {
      this.cache.delete(key)
    }, 5 * 60 * 1000)
    
    return data
  }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      - name: Build Docker image
        run: docker build -t ${{ secrets.DOCKER_REGISTRY }}/advanced-diagram-detection:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push ${{ secrets.DOCKER_REGISTRY }}/advanced-diagram-detection:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          # Your deployment script here
          echo "Deploying to production..."
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

test:
  stage: test
  image: node:18
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run lint
    - npm run type-check
    - npm run test
    - npm run test:e2e

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache curl
    - curl -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{"image":"'$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA'"}'
  only:
    - main
```

## 🔍 Health Checks and Monitoring

### Health Check Endpoint

```typescript
// server/api/health.get.ts
export default defineEventHandler(async (event) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: await checkDatabase(),
      geminiApi: await checkGeminiApi(),
      storage: await checkStorage()
    }
  }
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'ok')
  
  setResponseStatus(event, isHealthy ? 200 : 503)
  return health
})

async function checkDatabase(): Promise<{ status: string; latency?: number }> {
  try {
    const start = Date.now()
    // Test database connection
    const latency = Date.now() - start
    return { status: 'ok', latency }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: advanced-diagram-detection
spec:
  replicas: 3
  selector:
    matchLabels:
      app: advanced-diagram-detection
  template:
    metadata:
      labels:
        app: advanced-diagram-detection
    spec:
      containers:
      - name: app
        image: your-registry/advanced-diagram-detection:latest
        ports:
        - containerPort: 3000
        env:
        - name: NUXT_PUBLIC_GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: gemini-api-key
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: advanced-diagram-detection-service
spec:
  selector:
    app: advanced-diagram-detection
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 🚨 Troubleshooting Deployment Issues

### Common Issues and Solutions

#### 1. API Key Issues
```bash
# Check if API key is properly set
kubectl get secret app-secrets -o yaml
echo $NUXT_PUBLIC_GEMINI_API_KEY | base64 -d
```

#### 2. Memory Issues
```bash
# Check memory usage
docker stats
kubectl top pods

# Increase memory limits
# Update deployment.yml resources.limits.memory
```

#### 3. Network Issues
```bash
# Test connectivity
curl -f http://localhost:3000/health
kubectl port-forward pod/app-pod 3000:3000

# Check logs
docker logs container-id
kubectl logs deployment/advanced-diagram-detection
```

#### 4. Build Issues
```bash
# Clear build cache
npm run cleanup
docker system prune -a

# Rebuild with verbose output
npm run build -- --verbose
docker build --no-cache -t app .
```

### Rollback Procedures

#### Docker Rollback
```bash
# List previous images
docker images your-registry/advanced-diagram-detection

# Rollback to previous version
docker stop current-container
docker run -d --name app previous-image-tag
```

#### Kubernetes Rollback
```bash
# Check rollout history
kubectl rollout history deployment/advanced-diagram-detection

# Rollback to previous version
kubectl rollout undo deployment/advanced-diagram-detection

# Rollback to specific revision
kubectl rollout undo deployment/advanced-diagram-detection --to-revision=2
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] API keys secured and tested
- [ ] SSL certificates obtained
- [ ] Database migrations completed
- [ ] Performance testing completed
- [ ] Security scanning completed
- [ ] Backup procedures tested

### Deployment
- [ ] Application deployed successfully
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Logging configured
- [ ] CDN configured (if applicable)
- [ ] DNS configured
- [ ] Load balancer configured

### Post-Deployment
- [ ] Smoke tests completed
- [ ] Performance monitoring active
- [ ] Error tracking configured
- [ ] Backup verification
- [ ] Documentation updated
- [ ] Team notified

---

This deployment guide provides comprehensive instructions for deploying the Advanced Diagram Detection System across various platforms and environments. Choose the deployment method that best fits your infrastructure and requirements.