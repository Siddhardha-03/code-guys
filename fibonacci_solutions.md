# LeetCode-Style Solutions for Testing (No stdin required!)

## 🎯 How to Use:
1. Go to practice section
2. Select a problem 
3. Copy the solution below
4. Click "Run" to test
5. No need to handle input/output!

## JavaScript Solutions

### Two Sum
```javascript
var twoSum = function(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
};
```

### Fibonacci Number
```javascript
var fib = function(n) {
    if (n <= 1) return n;
    
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
        let temp = a + b;
        a = b;
        b = temp;
    }
    return b;
};
```

### Reverse String
```javascript
var reverseString = function(s) {
    let left = 0, right = s.length - 1;
    while (left < right) {
        [s[left], s[right]] = [s[right], s[left]];
        left++;
        right--;
    }
};
```

## Python Solutions

### Two Sum
```python
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        num_map = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in num_map:
                return [num_map[complement], i]
            num_map[num] = i
```

### Fibonacci Number
```python
class Solution:
    def fib(self, n: int) -> int:
        if n <= 1:
            return n
        
        a, b = 0, 1
        for i in range(2, n + 1):
            a, b = b, a + b
        return b
```

### Reverse String
```python
class Solution:
    def reverseString(self, s: List[str]) -> None:
        left, right = 0, len(s) - 1
        while left < right:
            s[left], s[right] = s[right], s[left]
            left += 1
            right -= 1
```

## Java Solutions

### Two Sum
```java
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}
```

### Fibonacci Number
```java
class Solution {
    public int fib(int n) {
        if (n <= 1) return n;
        
        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }
}
```

## C++ Solutions

### Two Sum
```cpp
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> map;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (map.find(complement) != map.end()) {
                return {map[complement], i};
            }
            map[nums[i]] = i;
        }
        return {};
    }
};
```

### Fibonacci Number
```cpp
class Solution {
public:
    int fib(int n) {
        if (n <= 1) return n;
        
        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }
};
```

## ✅ Test Cases (Automatic)
- Two Sum: [2,7,11,15], target=9 → [0,1]
- Fibonacci: n=4 → 3
- Reverse String: ["h","e","l","l","o"] → ["o","l","l","e","h"]

## 🎉 Benefits:
- ✅ No stdin/stdout handling needed
- ✅ Focus only on algorithm logic
- ✅ Just like LeetCode/GeeksforGeeks
- ✅ Automatic test case execution
- ✅ Clean, simple interface
