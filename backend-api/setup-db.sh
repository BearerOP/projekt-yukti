#!/bin/bash

echo "🚀 Setting up PostgreSQL database for Opinion Trading Platform..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=ota-postgres)" ]; then
    echo -e "${YELLOW}⚠️  Stopping existing ota-postgres container...${NC}"
    docker stop ota-postgres > /dev/null 2>&1
    docker rm ota-postgres > /dev/null 2>&1
fi

# Start PostgreSQL using docker-compose
echo -e "${YELLOW}📦 Starting PostgreSQL container...${NC}"
docker-compose up -d

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if container is running
if [ "$(docker ps -q -f name=ota-postgres)" ]; then
    echo -e "${GREEN}✅ PostgreSQL container is running!${NC}"

    # Wait for database to accept connections
    echo -e "${YELLOW}⏳ Waiting for database to accept connections...${NC}"
    for i in {1..30}; do
        if docker exec ota-postgres pg_isready -U user -d ota > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Database is ready!${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""

    # Run Prisma migrations
    echo -e "${YELLOW}🔄 Running Prisma migrations...${NC}"
    npx prisma migrate deploy

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database migrations completed successfully!${NC}"

        # Generate Prisma Client
        echo -e "${YELLOW}🔄 Generating Prisma Client...${NC}"
        npx prisma generate

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Prisma Client generated successfully!${NC}"
            echo ""
            echo -e "${GREEN}🎉 Database setup complete!${NC}"
            echo -e "${GREEN}📊 Database URL: postgresql://user:password@localhost:5432/ota${NC}"
            echo ""
            echo -e "${YELLOW}📝 Useful commands:${NC}"
            echo "  • View logs: docker logs ota-postgres -f"
            echo "  • Stop database: docker-compose down"
            echo "  • Start database: docker-compose up -d"
            echo "  • Access database: docker exec -it ota-postgres psql -U user -d ota"
            echo "  • View Prisma Studio: npx prisma studio"
        else
            echo -e "${RED}❌ Failed to generate Prisma Client${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Failed to run migrations${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Failed to start PostgreSQL container${NC}"
    exit 1
fi
