const requestCounts = new Map<string, number>();
const simulationCounts = new Map<string, number>();

export function recordHttpRequest(method: string, route: string, status: number): void {
  const normalizedRoute = route || 'unknown';
  const key = `${method.toUpperCase()}|${normalizedRoute}|${status}`;
  requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);
}

export function recordSimulationOutcome(status: string): void {
  simulationCounts.set(status, (simulationCounts.get(status) ?? 0) + 1);
}

export function generateMetrics(): string {
  const lines: string[] = [];
  const memory = process.memoryUsage();

  lines.push('# HELP process_uptime_seconds Total process uptime in seconds.');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${Math.floor(process.uptime())}`);

  lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes.');
  lines.push('# TYPE process_resident_memory_bytes gauge');
  lines.push(`process_resident_memory_bytes ${memory.rss}`);

  lines.push('# HELP process_heap_used_bytes Process heap memory used in bytes.');
  lines.push('# TYPE process_heap_used_bytes gauge');
  lines.push(`process_heap_used_bytes ${memory.heapUsed}`);

  lines.push('# HELP http_requests_total Total number of HTTP requests processed.');
  lines.push('# TYPE http_requests_total counter');
  if (requestCounts.size === 0) {
    lines.push('http_requests_total 0');
  } else {
    for (const [key, count] of requestCounts.entries()) {
      const [method, route, status] = key.split('|') as [string, string, string];
      lines.push(`http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
    }
  }

  lines.push('# HELP credit_simulations_total Total credit simulations created by decision status.');
  lines.push('# TYPE credit_simulations_total counter');
  for (const status of ['APPROVED', 'MANUAL_REVIEW', 'REJECTED']) {
    const count = simulationCounts.get(status) ?? 0;
    lines.push(`credit_simulations_total{status="${status}"} ${count}`);
  }

  return lines.join('\n') + '\n';
}
