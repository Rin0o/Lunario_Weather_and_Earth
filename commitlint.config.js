export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Subjects may start with proper nouns such as "IPMA" or "Lunário".
    'subject-case': [0],
    // Bodies and footers may hold long URLs (e.g. Dependabot release notes): warn, don't fail.
    'body-max-line-length': [1, 'always', 100],
    'footer-max-line-length': [1, 'always', 100],
  },
};
