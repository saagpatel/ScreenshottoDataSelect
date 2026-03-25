import "@testing-library/jest-dom";

// Mock chrome APIs for testing
const storageMock = new Map<string, unknown>();

const chromeStorageLocal = {
	get: vi.fn((keys: string | string[] | Record<string, unknown>) => {
		if (typeof keys === "string") {
			const val = storageMock.get(keys);
			return Promise.resolve(val !== undefined ? { [keys]: val } : {});
		}
		if (Array.isArray(keys)) {
			const result: Record<string, unknown> = {};
			for (const k of keys) {
				const val = storageMock.get(k);
				if (val !== undefined) result[k] = val;
			}
			return Promise.resolve(result);
		}
		// Object with defaults
		const result: Record<string, unknown> = {};
		for (const [k, defaultVal] of Object.entries(
			keys as Record<string, unknown>,
		)) {
			const val = storageMock.get(k);
			result[k] = val !== undefined ? val : defaultVal;
		}
		return Promise.resolve(result);
	}),
	set: vi.fn((items: Record<string, unknown>) => {
		for (const [k, v] of Object.entries(items)) {
			storageMock.set(k, v);
		}
		return Promise.resolve();
	}),
	remove: vi.fn((keys: string | string[]) => {
		const arr = typeof keys === "string" ? [keys] : keys;
		for (const k of arr) storageMock.delete(k);
		return Promise.resolve();
	}),
	clear: vi.fn(() => {
		storageMock.clear();
		return Promise.resolve();
	}),
};

const chromeMock = {
	storage: {
		local: chromeStorageLocal,
		onChanged: {
			addListener: vi.fn(),
			removeListener: vi.fn(),
		},
	},
	runtime: {
		sendMessage: vi.fn(),
		onMessage: {
			addListener: vi.fn(),
			removeListener: vi.fn(),
		},
		onConnect: {
			addListener: vi.fn(),
		},
		connect: vi.fn(() => ({
			postMessage: vi.fn(),
			onMessage: { addListener: vi.fn() },
			onDisconnect: { addListener: vi.fn() },
		})),
	},
	tabs: {
		sendMessage: vi.fn(),
		query: vi.fn(),
		captureVisibleTab: vi.fn(),
	},
	scripting: {
		executeScript: vi.fn(),
	},
	action: {
		setBadgeText: vi.fn(),
		setBadgeBackgroundColor: vi.fn(),
	},
	offscreen: {
		createDocument: vi.fn(),
		closeDocument: vi.fn(),
		Reason: { CANVAS: "CANVAS" },
	},
	commands: {
		onCommand: {
			addListener: vi.fn(),
		},
	},
};

Object.assign(globalThis, { chrome: chromeMock });

// Reset storage between tests
beforeEach(() => {
	storageMock.clear();
	vi.clearAllMocks();
});

export { storageMock };
