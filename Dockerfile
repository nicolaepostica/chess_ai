FROM python:3.10
RUN  pip3 install pipenv
RUN pipenv install --system --deploy --ignore-pipfile