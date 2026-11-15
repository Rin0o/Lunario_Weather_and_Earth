export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Subjects may start with proper nouns such as "IPMA" or "Lunário".
    'subject-case': [0],
  },
};
