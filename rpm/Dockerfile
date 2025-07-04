FROM ubuntu:noble-20250529

RUN curl -sL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
RUN bash /tmp/nodesource_setup.sh
RUN apt update && apt install alien nodejs -y
RUN useradd ingrid

CMD tail -f /dev/null
