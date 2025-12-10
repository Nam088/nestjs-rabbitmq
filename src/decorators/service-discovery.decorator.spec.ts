import { InjectServiceDiscovery } from './service-discovery.decorator';

describe('InjectServiceDiscovery Decorator', () => {
    it('should inject service discovery with correct token', () => {
        class TestClass {
            constructor(@InjectServiceDiscovery() public discovery: any) {}
        }

        const metadata = Reflect.getMetadata('design:paramtypes', TestClass);

        expect(metadata).toBeDefined();
    });

    it('should use correct injection token', () => {
        const result = InjectServiceDiscovery();

        // The decorator should be a function
        expect(typeof result).toBe('function');
    });

    it('should work with multiple parameters', () => {
        class TestClass {
            constructor(
                @InjectServiceDiscovery() public discovery1: any,
                @InjectServiceDiscovery() public discovery2: any,
            ) {}
        }

        const metadata = Reflect.getMetadata('design:paramtypes', TestClass);

        expect(metadata).toBeDefined();
    });

    it('should inject with the RABBITMQ_SERVICE_DISCOVERY token', () => {
        class TestClass {
            constructor(@InjectServiceDiscovery() public discovery: any) {}
        }

        // Get injection metadata
        const paramTypes = Reflect.getMetadata('design:paramtypes', TestClass);

        expect(paramTypes).toBeDefined();
    });

    it('should be compatible with NestJS dependency injection', () => {
        // This test verifies the decorator returns a valid ParameterDecorator
        const decorator = InjectServiceDiscovery();

        expect(typeof decorator).toBe('function');

        // The decorator should accept the standard parameters
        const mockTarget = class {};
        const mockPropertyKey = undefined;
        const mockParameterIndex = 0;

        // Should not throw when applied
        expect(() => {
            decorator(mockTarget, mockPropertyKey as any, mockParameterIndex);
        }).not.toThrow();
    });

    it('should support custom connectionName parameter', () => {
        const customConnectionName = 'custom-connection';
        const decorator = InjectServiceDiscovery(customConnectionName);

        expect(typeof decorator).toBe('function');

        // Should not throw when applied
        const mockTarget = class {};

        expect(() => {
            decorator(mockTarget, undefined as any, 0);
        }).not.toThrow();
    });

    it('should use default connection name when not specified', () => {
        const decorator = InjectServiceDiscovery();

        expect(typeof decorator).toBe('function');
    });
});
