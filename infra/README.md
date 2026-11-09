# Optional edge stack

Use this stack only when provisioning a new edge environment. Existing deployments that already use Traefik and Cloudflare Tunnel should reuse those shared services. The application rollout never brings up this Compose project.

The example runs Traefik and a remotely managed `cloudflared` connector on an external Docker network. It publishes no host ports. Traefik discovers explicitly enabled containers from Docker labels, and its dashboard is disabled.

Prepare an external network if it does not already exist:

```bash
docker network create celo-network
```

Create a private edge environment file using `.env.example` as the template, set the actual tunnel token and network name, and keep the file mode 600. From the repository root:

```bash
docker compose --env-file /private/path/edge.env -f infra/compose.yaml up -d
```

In Cloudflare, configure the API's public hostname with service `http://traefik:80`. Preserve the original Host header so Traefik can match the API's `DOMAIN_NAME` label. Both the edge stack and the application must use the same external network name.

The connector opens outbound connections to Cloudflare; public inbound API or SSH listeners are unnecessary for this topology. Administrative SSH travels through Tailscale, which is installed separately on the VPS host.

Traefik mounts the host Docker socket for discovery. A read-only mount does not make the Docker API read-only. Use a restricted Docker API proxy or an equivalent isolation mechanism if the edge is exposed to less-trusted workloads. Restrict access to the connector token and deployment identity.

The images are pinned by digest. Review and update these pins when upgrading the shared edge; ensure the Traefik release supports the host Docker API version.
