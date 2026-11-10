set -euo pipefail
image=${1:?Image reference is required}
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:0.69.3@sha256:bcc376de8d77cfe086a917230e818dc9f8528e3c852f7b1aff648949b6258d1c \
  image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --scanners vuln "$image"
