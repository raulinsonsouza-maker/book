#!/bin/sh
set -e

mkdir -p /data
chown -R nextjs:nodejs /data

if [ -f /app/prisma/schema.prisma ]; then
  gosu nextjs npx prisma migrate deploy
fi

exec gosu nextjs "$@"
