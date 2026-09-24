resource "aws_elasticache_subnet_group" "redis" {
  name       = "communication-redis"
  subnet_ids = var.redis_subnet_ids
}

variable "redis_subnet_ids" {
  type = list(string)
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "communication-redis"
  description                = "Communication signaling Redis"
  node_type                  = "cache.t4g.small"
  num_cache_clusters         = 2
  port                       = 6379
  automatic_failover_enabled = true
  multi_az_enabled           = true
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
}
