.PHONY: phpcs phpstan codeception test install install-dev bundle docker-tag docker-login docker-push docker-build grumphp update

update:
	composer update

install:
	composer install --no-dev

install-dev:
	composer install

bundle: install
	box compile

docker-tag: docker-build
	docker tag dandelionphp/dandelion dandelionphp/dandelion:$(IMAGE_TAG)

docker-build:
	docker build -t dandelionphp/dandelion .

docker-login:
	echo "$(DOCKER_PASSWORD)" | docker login -u "$(DOCKER_USERNAME)" --password-stdin

docker-push: docker-login
	docker push dandelionphp/dandelion:latest
	docker push dandelionphp/dandelion:$(IMAGE_TAG)

phpcs:
	./vendor/bin/phpcs --standard=./vendor/squizlabs/php_codesniffer/src/Standards/PSR12/ruleset.xml ./src/

phpstan:
	./vendor/bin/phpstan analyse

codeception:
	./vendor/bin/codecept run --coverage --coverage-xml --coverage-html

phpmd:
	./vendor/bin/phpmd ./src xml cleancode,codesize,controversial,design --exclude DandelionServiceProvider,Git,Filesystem

phpcpd:
	./vendor/bin/phpcpd ./src

ci: phpcs phpstan codeception phpmd phpcpd

test: install-dev ci
