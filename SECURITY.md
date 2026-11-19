# Security policy

## Supported versions

Security fixes go to the latest release of each published package
(`@zealakit/chrono-vanilla`, `@zealakit/chrono-react`, `@zealakit/chrono-vue`,
`@zealakit/chrono-svelte`). From 1.0 the latest minor of the latest major is supported.

## Reporting a vulnerability

Please do **not** open a public issue. Use GitHub's private vulnerability reporting: on the
repository page choose **Security → Report a vulnerability**. (The maintainer enables this in
the repository settings; no email address is published here.)

Include the package and version, a minimal reproduction, and the impact you see. You can expect
an acknowledgement within a few days and a coordinated fix and disclosure.

## Scope

Chrono is a client-side UI library with no runtime dependencies, no network access and no
storage. Reports about the library's own code (for example unsafe attribute output) are in
scope. Vulnerabilities in your app's use of the proposals Chrono emits are not.
