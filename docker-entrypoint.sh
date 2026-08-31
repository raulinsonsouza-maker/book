#!/bin/sh
set -e

mkdir -p /data /app/public/uploads/covers
chown -R nextjs:nodejs /data /app/public/uploads

if [ -f /app/prisma/schema.prisma ]; then
  gosu nextjs npx prisma migrate deploy
fi

exec gosu nextjs "$@"
