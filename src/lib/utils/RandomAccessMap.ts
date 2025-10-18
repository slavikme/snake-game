/**
 * RandomAccessMap - Extended Map with O(1) random access
 *
 * A Map that supports efficient random element retrieval while maintaining
 * all standard Map operations at O(1) complexity.
 *
 * Implements the proposed ES standard `.randomEntry()` method:
 * @see https://es.discourse.group/t/proposal-map-set-prototype-randomentry/1799
 *
 * This implementation maintains an internal array of keys and an index map
 * to enable O(1) random access without compromising Map's performance.
 *
 * Use cases:
 * - Game entity pools (spawn random enemy from available pool)
 * - Random sampling from collections
 * - Lottery/raffle systems
 * - Load balancing (pick random server)
 * - Randomized algorithms requiring fast lookups
 *
 * Performance (all operations): O(1)
 * - set: O(1)
 * - delete: O(1) using swap-remove pattern
 * - get: O(1)
 * - has: O(1)
 * - randomEntry: O(1)
 *
 * Memory overhead: 2× additional storage (keysArray + keyIndexMap)
 * For 1,296 entries: ~100-200KB additional memory
 *
 * @example
 * ```typescript
 * const map = new RandomAccessMap<string, number>();
 * map.set("a", 1);
 * map.set("b", 2);
 * map.set("c", 3);
 *
 * // Get random entry (proposed ES standard method)
 * const random = map.randomEntry(); // [key, value] e.g., ["b", 2]
 *
 * // Also works with all standard Map methods
 * map.get("a"); // 1
 * map.has("b"); // true
 * map.delete("c"); // true
 * map.size; // 2
 * ```
 */
export class RandomAccessMap<K, V> extends Map<K, V> {
  private keysArray: K[] = [];
  private keyIndexMap: Map<K, number> = new Map();

  /**
   * Creates a new RandomAccessMap.
   * @param entries Optional iterable of key-value pairs to initialize the map
   */
  constructor(entries?: readonly (readonly [K, V])[] | null) {
    super();
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value); // Uses our overridden set()
      }
    }
  }

  /**
   * Adds or updates a key-value pair in the map.
   * Maintains internal arrays for O(1) random access.
   *
   * @param key The key of the element to add
   * @param value The value of the element to add
   * @returns The map instance for chaining
   */
  override set(key: K, value: V): this {
    const isNewKey = !super.has(key);

    super.set(key, value);

    if (isNewKey) {
      // New key: add to array and track index
      this.keysArray.push(key);
      this.keyIndexMap.set(key, this.keysArray.length - 1);
    }

    return this;
  }

  /**
   * Removes a key-value pair from the map.
   * Uses swap-remove pattern for O(1) deletion.
   *
   * @param key The key of the element to remove
   * @returns true if element was removed, false if it didn't exist
   */
  override delete(key: K): boolean {
    if (!super.has(key)) return false;

    // Remove from parent Map
    super.delete(key);

    // Get index of key to delete
    const index = this.keyIndexMap.get(key)!;
    const lastIndex = this.keysArray.length - 1;

    // If it's not the last element, swap with last element
    if (index !== lastIndex) {
      const lastKey = this.keysArray[lastIndex];
      this.keysArray[index] = lastKey;
      this.keyIndexMap.set(lastKey, index);
    }

    // Remove last element
    this.keysArray.pop();
    this.keyIndexMap.delete(key);

    return true;
  }

  /**
   * Removes all key-value pairs from the map.
   */
  override clear(): void {
    super.clear();
    this.keysArray = [];
    this.keyIndexMap.clear();
  }

  /**
   * Returns a random entry from the map in O(1) time.
   *
   * This method implements the proposed ES standard `.randomEntry()` method.
   * @see https://es.discourse.group/t/proposal-map-set-prototype-randomentry/1799
   *
   * @returns A random [key, value] pair, or undefined if map is empty
   *
   * @example
   * ```typescript
   * const map = new RandomAccessMap([["a", 1], ["b", 2]]);
   * const entry = map.randomEntry(); // ["a", 1] or ["b", 2]
   * if (entry) {
   *   const [key, value] = entry;
   *   console.log(`Random: ${key} = ${value}`);
   * }
   * ```
   */
  randomEntry(): [K, V] | undefined {
    if (this.keysArray.length === 0) return undefined;

    const randomIndex = Math.floor(Math.random() * this.keysArray.length);
    const randomKey = this.keysArray[randomIndex];
    const randomValue = super.get(randomKey)!;

    return [randomKey, randomValue];
  }
}

export default RandomAccessMap;
