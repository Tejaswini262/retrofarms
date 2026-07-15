#!/usr/bin/env python3
"""
Backend API Test Suite for NEW Retro Farms Features
Tests the newly added endpoints:
1. Offline order with total_override
2. Customer orders endpoint (GET /api/admin/customers/{user_id}/orders)
3. total_spent regression fix
4. Regression tests for existing endpoints
"""

import requests
import json
import time
from typing import Dict, Optional

# Backend URL
BASE_URL = "https://farm-to-table-541.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@retrofarms.in"
ADMIN_PASSWORD = "admin123"

# Global state
admin_cookies = None
test_customer_user_id = None

class TestResult:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name: str, details: str = ""):
        self.passed.append(f"✅ {test_name}" + (f": {details}" if details else ""))
        print(f"✅ PASS: {test_name}" + (f" - {details}" if details else ""))
    
    def add_fail(self, test_name: str, details: str):
        self.failed.append(f"❌ {test_name}: {details}")
        print(f"❌ FAIL: {test_name}: {details}")
    
    def add_warning(self, test_name: str, details: str):
        self.warnings.append(f"⚠️  {test_name}: {details}")
        print(f"⚠️  WARNING: {test_name}: {details}")
    
    def summary(self):
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Passed: {len(self.passed)}")
        print(f"Failed: {len(self.failed)}")
        print(f"Warnings: {len(self.warnings)}")
        print("="*80)
        
        if self.failed:
            print("\n❌ FAILED TESTS:")
            for f in self.failed:
                print(f"  {f}")
        
        if self.warnings:
            print("\n⚠️  WARNINGS:")
            for w in self.warnings:
                print(f"  {w}")
        
        if self.passed:
            print("\n✅ PASSED TESTS:")
            for p in self.passed:
                print(f"  {p}")
        
        return len(self.failed) == 0

result = TestResult()

def admin_login():
    """Login as admin and store cookies"""
    global admin_cookies
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/admin-login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        if resp.status_code == 200:
            admin_cookies = resp.cookies
            result.add_pass("Admin login", f"Logged in as {ADMIN_EMAIL}")
            return True
        else:
            result.add_fail("Admin login", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        result.add_fail("Admin login", str(e))
        return False

def test_offline_order_with_total_override():
    """Test 1: POST /api/admin/orders/offline with total_override"""
    global test_customer_user_id
    try:
        payload = {
            "customer_name": "Manual Total Customer",
            "customer_phone": "8888800000",
            "items": [{"slug": "tomatoes", "variant_id": "1kg", "qty": 3}],
            "payment_method": "cash",
            "payment_status": "Paid",
            "total_override": 250
        }
        resp = requests.post(
            f"{BASE_URL}/admin/orders/offline",
            json=payload,
            cookies=admin_cookies,
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            # Expected: subtotal=3*55=165, total_override=250, delivery=250-165=85
            expected_subtotal = 165
            expected_total = 250
            expected_delivery = 85
            
            if data.get('subtotal') == expected_subtotal and \
               data.get('total') == expected_total and \
               data.get('delivery_charge') == expected_delivery:
                result.add_pass(
                    "Offline order with total_override",
                    f"subtotal={data['subtotal']}, delivery_charge={data['delivery_charge']}, total={data['total']}"
                )
                # Store customer user_id for later tests
                test_customer_user_id = data.get('user_id')
            else:
                result.add_fail(
                    "Offline order with total_override",
                    f"Expected subtotal={expected_subtotal}, delivery_charge={expected_delivery}, total={expected_total}, "
                    f"got subtotal={data.get('subtotal')}, delivery_charge={data.get('delivery_charge')}, total={data.get('total')}"
                )
        else:
            result.add_fail("Offline order with total_override", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Offline order with total_override", str(e))

def test_offline_order_without_total_override():
    """Test 2: POST /api/admin/orders/offline WITHOUT total_override (regression)"""
    try:
        payload = {
            "customer_name": "Auto Total Customer",
            "customer_phone": "8888800001",
            "items": [{"slug": "tomatoes", "variant_id": "1kg", "qty": 3}],
            "payment_method": "cash",
            "payment_status": "Paid"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/orders/offline",
            json=payload,
            cookies=admin_cookies,
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            # Expected: subtotal=3*55=165, delivery=100 (subtotal<200), total=265
            expected_subtotal = 165
            expected_delivery = 100
            expected_total = 265
            
            if data.get('subtotal') == expected_subtotal and \
               data.get('delivery_charge') == expected_delivery and \
               data.get('total') == expected_total:
                result.add_pass(
                    "Offline order without total_override",
                    f"subtotal={data['subtotal']}, delivery_charge={data['delivery_charge']}, total={data['total']}"
                )
            else:
                result.add_fail(
                    "Offline order without total_override",
                    f"Expected subtotal={expected_subtotal}, delivery_charge={expected_delivery}, total={expected_total}, "
                    f"got subtotal={data.get('subtotal')}, delivery_charge={data.get('delivery_charge')}, total={data.get('total')}"
                )
        else:
            result.add_fail("Offline order without total_override", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Offline order without total_override", str(e))

def test_get_customers_list():
    """Test 3: GET /api/admin/customers to fetch customer list"""
    global test_customer_user_id
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/customers",
            cookies=admin_cookies,
            timeout=10
        )
        if resp.status_code == 200:
            customers = resp.json()
            if isinstance(customers, list) and len(customers) > 0:
                # Pick first customer with orders > 0
                customer_with_orders = None
                for c in customers:
                    if c.get('orders', 0) > 0:
                        customer_with_orders = c
                        break
                
                if customer_with_orders:
                    test_customer_user_id = customer_with_orders['user_id']
                    result.add_pass(
                        "Get customers list",
                        f"Found {len(customers)} customers, selected user_id={test_customer_user_id} with {customer_with_orders['orders']} orders"
                    )
                else:
                    result.add_warning(
                        "Get customers list",
                        f"Found {len(customers)} customers but none have orders"
                    )
            else:
                result.add_fail("Get customers list", f"Expected non-empty list, got {customers}")
        else:
            result.add_fail("Get customers list", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Get customers list", str(e))

def test_customer_orders_endpoint():
    """Test 4: GET /api/admin/customers/{user_id}/orders"""
    if not test_customer_user_id:
        result.add_fail("Customer orders endpoint", "No test_customer_user_id available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/customers/{test_customer_user_id}/orders",
            cookies=admin_cookies,
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if 'user' in data and 'orders' in data:
                user = data['user']
                orders = data['orders']
                if isinstance(orders, list):
                    result.add_pass(
                        "Customer orders endpoint",
                        f"user_id={user.get('user_id')}, found {len(orders)} orders"
                    )
                else:
                    result.add_fail("Customer orders endpoint", f"Expected orders list, got {type(orders)}")
            else:
                result.add_fail("Customer orders endpoint", f"Missing 'user' or 'orders' in response: {data}")
        else:
            result.add_fail("Customer orders endpoint", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Customer orders endpoint", str(e))

def test_customer_orders_nonexistent():
    """Test 5: GET /api/admin/customers/nonexistent-id/orders"""
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/customers/nonexistent-user-id-12345/orders",
            cookies=admin_cookies,
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            # Should return 200 with empty orders or user:null
            if 'orders' in data:
                if isinstance(data['orders'], list) and len(data['orders']) == 0:
                    result.add_pass(
                        "Customer orders nonexistent user",
                        "Returns 200 with empty orders list"
                    )
                else:
                    result.add_fail(
                        "Customer orders nonexistent user",
                        f"Expected empty orders list, got {data['orders']}"
                    )
            else:
                result.add_fail("Customer orders nonexistent user", f"Missing 'orders' in response: {data}")
        else:
            result.add_fail("Customer orders nonexistent user", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Customer orders nonexistent user", str(e))

def test_total_spent_regression():
    """Test 6: GET /api/admin/customers - verify total_spent calculation"""
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/customers",
            cookies=admin_cookies,
            timeout=10
        )
        if resp.status_code == 200:
            customers = resp.json()
            if isinstance(customers, list) and len(customers) > 0:
                # Check that customers with orders have total_spent > 0
                customers_with_orders = [c for c in customers if c.get('orders', 0) > 0]
                customers_with_spent = [c for c in customers_with_orders if c.get('total_spent', 0) > 0]
                
                if len(customers_with_spent) > 0:
                    # Verify list is sorted by total_spent desc
                    is_sorted = all(
                        customers[i].get('total_spent', 0) >= customers[i+1].get('total_spent', 0)
                        for i in range(len(customers)-1)
                    )
                    
                    if is_sorted:
                        result.add_pass(
                            "total_spent regression fix",
                            f"{len(customers_with_spent)}/{len(customers_with_orders)} customers with orders have total_spent > 0, sorted correctly"
                        )
                    else:
                        result.add_fail(
                            "total_spent regression fix",
                            "Customers list not sorted by total_spent descending"
                        )
                else:
                    result.add_warning(
                        "total_spent regression fix",
                        f"Found {len(customers_with_orders)} customers with orders but none have total_spent > 0"
                    )
            else:
                result.add_fail("total_spent regression fix", f"Expected non-empty list, got {customers}")
        else:
            result.add_fail("total_spent regression fix", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("total_spent regression fix", str(e))

def test_regression_products():
    """Test 7: GET /api/products (regression)"""
    try:
        resp = requests.get(f"{BASE_URL}/products", timeout=10)
        if resp.status_code == 200:
            products = resp.json()
            if isinstance(products, list) and len(products) >= 11:
                result.add_pass("Regression: products list", f"Found {len(products)} products")
            else:
                result.add_fail("Regression: products list", f"Expected >= 11 products, got {len(products)}")
        else:
            result.add_fail("Regression: products list", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Regression: products list", str(e))

def test_regression_admin_stats():
    """Test 8: GET /api/admin/stats (regression)"""
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/stats",
            cookies=admin_cookies,
            timeout=10
        )
        if resp.status_code == 200:
            stats = resp.json()
            required_keys = ['revenue', 'orders', 'pending', 'products', 'customers']
            if all(k in stats for k in required_keys):
                result.add_pass(
                    "Regression: admin stats",
                    f"revenue={stats['revenue']}, orders={stats['orders']}, pending={stats['pending']}"
                )
            else:
                result.add_fail("Regression: admin stats", f"Missing required keys in response: {stats}")
        else:
            result.add_fail("Regression: admin stats", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Regression: admin stats", str(e))

def test_regression_offline_order_basic():
    """Test 9: POST /api/admin/orders/offline basic functionality (regression)"""
    try:
        payload = {
            "customer_name": "Regression Test Customer",
            "customer_phone": "9999900000",
            "items": [{"slug": "green-chilli", "variant_id": "250g", "qty": 1}],
            "payment_method": "cash",
            "payment_status": "Paid"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/orders/offline",
            json=payload,
            cookies=admin_cookies,
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if 'order_id' in data and 'total' in data:
                result.add_pass(
                    "Regression: offline order basic",
                    f"order_id={data['order_id']}, total={data['total']}"
                )
            else:
                result.add_fail("Regression: offline order basic", f"Missing required fields in response: {data}")
        else:
            result.add_fail("Regression: offline order basic", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Regression: offline order basic", str(e))

def main():
    print("="*80)
    print("RETRO FARMS - NEW FEATURES BACKEND API TEST SUITE")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    print("="*80)
    
    # Login as admin
    if not admin_login():
        print("\n❌ Admin login failed. Cannot proceed with tests.")
        return 1
    
    print("\n" + "="*80)
    print("TESTING NEW FEATURES")
    print("="*80)
    
    # Test 1: Offline order with total_override
    test_offline_order_with_total_override()
    
    # Test 2: Offline order without total_override (regression)
    test_offline_order_without_total_override()
    
    # Test 3: Get customers list
    test_get_customers_list()
    
    # Test 4: Customer orders endpoint
    test_customer_orders_endpoint()
    
    # Test 5: Customer orders nonexistent user
    test_customer_orders_nonexistent()
    
    # Test 6: total_spent regression fix
    test_total_spent_regression()
    
    print("\n" + "="*80)
    print("REGRESSION TESTS")
    print("="*80)
    
    # Test 7: Products list
    test_regression_products()
    
    # Test 8: Admin stats
    test_regression_admin_stats()
    
    # Test 9: Offline order basic
    test_regression_offline_order_basic()
    
    # Print summary
    success = result.summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
