#!/bin/sh
set -e

mkdir -p /data /app/public/uploads/covers /app/uploads/intake
chown -R nextjs:nodejs /data /app/public/uploads /app/uploads

if [ -f /app/prisma/schema.prisma ]; then
  gosu nextjs npx prisma migrate deploy
fi

exec gosu nextjs "$@"
