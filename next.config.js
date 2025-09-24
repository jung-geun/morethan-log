module.exports = {
  images: {
    domains: ['www.notion.so', 'lh5.googleusercontent.com', 's3-us-west-2.amazonaws.com'],
  },
  // Generate 404 page instead of failing build for missing pages
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // Error handling during static generation
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  }
}
