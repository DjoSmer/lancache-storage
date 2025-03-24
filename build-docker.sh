docker build --tag djosmer/lancache-storage:latest .
docker build -f Dockerfile-dev --tag djosmer/lancache-storage:dev .
docker build --tag djosmer/lancache-nginx:latest nginx/