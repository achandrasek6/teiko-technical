.PHONY: setup pipeline dashboard

setup:
	python3 -m venv venv
	./venv/bin/pip install -r requirements.txt
	cd frontend && npm install
	curl -s https://get.nextflow.io | bash

pipeline:
	./nextflow run main.nf

dashboard:
	./venv/bin/uvicorn src.api.main:app --reload --port 8000 & npm --prefix frontend run dev
