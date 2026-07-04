/**
 * Resolves PostgreSQL connection settings.
 *
 * Priority (first match wins):
 *  1. DATABASE_URL          — standard (Railway, Neon, Supabase, Heroku, Docker, etc.)
 *  2. TURBO_DATABASE_URL    — explicit turbo-api override
 *  3. turbo-config.json → postgres.connectionString
 *  4. turbo-config.json → databaseUrl (shorthand at root)
 *  5. turbo-config.json → postgres.host/user/password/database/port/ssl
 *  6. PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT env vars (node-pg convention)
 */
const resolvePostgresConfig = (config = {}) => {
    if (process.env.DATABASE_URL)
        return { connectionString: process.env.DATABASE_URL }

    if (process.env.TURBO_DATABASE_URL)
        return { connectionString: process.env.TURBO_DATABASE_URL }

    const fromConfig = config.postgres || {}
    if (fromConfig.connectionString)
        return { connectionString: fromConfig.connectionString }

    if (config.databaseUrl)
        return { connectionString: config.databaseUrl }

    const host = fromConfig.host || process.env.PGHOST
    const user = fromConfig.user || process.env.PGUSER
    const password = fromConfig.password ?? process.env.PGPASSWORD
    const database = fromConfig.database || process.env.PGDATABASE
    const port = fromConfig.port || process.env.PGPORT

    if (host && user && database) {
        const resolved = { host, user, database }
        if (password !== undefined && password !== '') resolved.password = password
        if (port) resolved.port = Number(port)
        if (fromConfig.ssl === true || process.env.PGSSLMODE === 'require')
            resolved.ssl = { rejectUnauthorized: false }
        return resolved
    }

    throw new Error(
        'PostgreSQL is not configured. Set DATABASE_URL (recommended), TURBO_DATABASE_URL, ' +
        'turbo-config.json postgres.connectionString, or PGHOST/PGUSER/PGDATABASE.'
    )
}

module.exports = {
    resolvePostgresConfig,
}
