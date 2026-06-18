FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    libzip-dev zip unzip git curl libpng-dev libxml2-dev \
    && docker-php-ext-install pcntl posix pdo pdo_mysql mbstring \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /app
COPY . .
RUN composer install --no-dev --optimize-autoloader

EXPOSE 8080

CMD ["php", "artisan", "reverb:start", "--host=0.0.0.0", "--port=8080"]