# Dapr Agents Documentation

This directory contains comprehensive documentation for the Dapr Agents TypeScript project.

## 📋 Table of Contents

### Architecture & Configuration
- **[Dapr Configuration Guide](./architecture/dapr-configuration-guide.md)** - Complete walkthrough of Dapr subsystem configuration and operation

### Quick Reference Guides
- **[Pub/Sub Guide](../PUBSUB_GUIDE.md)** - Dynamic pub/sub configuration switching

### Utility Scripts
- **[Environment Switching](../switch-pubsub.ts)** - Switch between Redis and in-memory pub/sub
- **[Model Switching](../switch-model.ts)** - Switch between different Azure OpenAI deployments

## 🚀 Quick Start

1. **Start Debugging**: Press `F5` in VS Code
2. **Switch PubSub**: `npx tsx switch-pubsub.ts redis`
3. **Switch Model**: `npx tsx switch-model.ts your-deployment-name`
4. **View Configuration**: `npx tsx switch-pubsub.ts` (no args)

## 📁 Documentation Structure

```
docs/
├── README.md                    # This file
├── architecture/
│   └── dapr-configuration-guide.md  # Comprehensive Dapr setup guide
├── examples/                    # Example configurations (future)
├── troubleshooting/            # Troubleshooting guides (future)
└── api/                        # API documentation (future)
```

## 🔧 Development Workflow

### Environment-Driven Configuration
- All runtime behavior controlled via `.env` file
- No code changes needed for different environments
- Dynamic component switching

### VS Code Integration
- One-click debugging with F5
- Automatic Dapr sidecar management
- Integrated terminal output

### Component Management
- Enable/disable services by file renaming
- Support for multiple backends (Redis, in-memory)
- Flexible Azure OpenAI deployment targeting

## 📚 Additional Resources

- [Dapr Documentation](https://docs.dapr.io/)
- [Azure OpenAI Documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/openai/)
- [VS Code Debugging Guide](https://code.visualstudio.com/docs/editor/debugging)

## 🤝 Contributing

When adding new documentation:

1. Create files in appropriate subdirectories
2. Update this README with links
3. Follow the established markdown formatting
4. Include practical examples and troubleshooting

## 🏷️ Document Versioning

- **Created**: October 1, 2025
- **Last Updated**: October 1, 2025
- **Target Audience**: Developers working with Dapr and TypeScript

---

*For questions about this documentation, please create an issue or contribute improvements.*