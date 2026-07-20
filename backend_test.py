#!/usr/bin/env python3
"""
Backend API Test Suite for Retro Farms - Refactored Endpoints Verification
Tests the optimized admin endpoints that now use MongoDB aggregation pipelines
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://farm-to-table-541.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@retrofarms.in"
ADMIN_PASSWORD = "admin123"

# Test results tracking
tests_passed = 0
tests_failed = 0
failures = []

def log_test(name, passed, details=""):
    global tests_passed, tests_failed, failures
    if passed:
        tests_passed += 1
        print(f"✅ {name}")
    else:
        tests_failed += 1
        failures.append(f"{name}: {details}")
        print(f"❌ {name}")
        if details:
            print(f"   Details: {details}")

def admin_login():
    """Login as admin and return session cookie"""
    print("\n🔐 Logging in as admin...")
    resp = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code != 200:
        print(f"❌ Admin login failed: {resp.status_code} - {resp.text}")
        return None
    
    session_token = resp.cookies.get('session_token')
    if not session_token:
        print("❌ No session_token cookie received")
        return None
    
    print(f"✅ Admin login successful")
    return {'session_token': session_token}

def test_admin_stats(cookies):
    """Test 1: GET /api/admin/stats - must return correct structure with aggregated data"""
    print("\n📊 Test 1: Admin Stats Endpoint")
    resp = requests.get(f"{BASE_URL}/admin/stats", cookies=cookies)
    
    if resp.status_code != 200:
        log_test("Admin stats - status code", False, f"Expected 200, got {resp.status_code}")
        return None
    
    log_test("Admin stats - status code", True)
    
    data = resp.json()
    required_keys = ['revenue', 'orders', 'pending', 'products', 'customers']
    
    # Check all required keys exist
    missing_keys = [k for k in required_keys if k not in data]
    if missing_keys:
        log_test("Admin stats - required keys", False, f"Missing keys: {missing_keys}")
        return None
    
    log_test("Admin stats - required keys", True)
    
    # Check all values are numeric
    non_numeric = [k for k in required_keys if not isinstance(data[k], (int, float))]
    if non_numeric:
        log_test("Admin stats - numeric values", False, f"Non-numeric values: {non_numeric}")
        return None
    
    log_test("Admin stats - numeric values", True)
    
    # Check products >= 11 (seeded products)
    if data['products'] < 11:
        log_test("Admin stats - products count", False, f"Expected >= 11, got {data['products']}")
    else:
        log_test("Admin stats - products count", True)
    
    # Check customers > 0
    if data['customers'] <= 0:
        log_test("Admin stats - customers count", False, f"Expected > 0, got {data['customers']}")
    else:
        log_test("Admin stats - customers count", True)
    
    print(f"   Stats: revenue={data['revenue']}, orders={data['orders']}, pending={data['pending']}, products={data['products']}, customers={data['customers']}")
    return data

def test_admin_orders_pagination(cookies):
    """Test 2: GET /api/admin/orders - test pagination with limit and skip"""
    print("\n📦 Test 2: Admin Orders Pagination")
    
    # Test 2a: Default (up to 500 orders)
    resp = requests.get(f"{BASE_URL}/admin/orders", cookies=cookies)
    if resp.status_code != 200:
        log_test("Admin orders - default request", False, f"Status {resp.status_code}")
        return None
    
    log_test("Admin orders - default request", True)
    
    all_orders = resp.json()
    if not isinstance(all_orders, list):
        log_test("Admin orders - returns array", False, f"Expected array, got {type(all_orders)}")
        return None
    
    log_test("Admin orders - returns array", True)
    print(f"   Total orders: {len(all_orders)}")
    
    # Check sorting by created_at desc
    if len(all_orders) >= 2:
        dates = [o.get('created_at') for o in all_orders[:10]]
        is_sorted = all(dates[i] >= dates[i+1] for i in range(len(dates)-1) if dates[i] and dates[i+1])
        log_test("Admin orders - sorted by created_at desc", is_sorted, 
                 "Orders not sorted correctly" if not is_sorted else "")
    
    # Check required fields in first order
    if all_orders:
        first_order = all_orders[0]
        required_fields = ['order_id', 'customer_email', 'items', 'total', 'status', 
                          'payment_status', 'address', 'assigned_staff_id']
        missing = [f for f in required_fields if f not in first_order]
        if missing:
            log_test("Admin orders - required fields", False, f"Missing: {missing}")
        else:
            log_test("Admin orders - required fields", True)
    
    # Test 2b: limit=5
    resp = requests.get(f"{BASE_URL}/admin/orders?limit=5", cookies=cookies)
    if resp.status_code != 200:
        log_test("Admin orders - limit=5", False, f"Status {resp.status_code}")
        return None
    
    limited_orders = resp.json()
    if len(limited_orders) > 5:
        log_test("Admin orders - limit=5 respected", False, f"Expected max 5, got {len(limited_orders)}")
    else:
        log_test("Admin orders - limit=5 respected", True)
        print(f"   Limited orders: {len(limited_orders)}")
    
    # Test 2c: limit=5&skip=5 (pagination)
    resp = requests.get(f"{BASE_URL}/admin/orders?limit=5&skip=5", cookies=cookies)
    if resp.status_code != 200:
        log_test("Admin orders - pagination (skip)", False, f"Status {resp.status_code}")
        return None
    
    paginated_orders = resp.json()
    log_test("Admin orders - pagination (skip)", True)
    print(f"   Paginated orders (skip=5): {len(paginated_orders)}")
    
    # Verify pagination returns different orders
    if len(all_orders) > 5 and limited_orders and paginated_orders:
        first_page_ids = [o['order_id'] for o in limited_orders]
        second_page_ids = [o['order_id'] for o in paginated_orders]
        overlap = set(first_page_ids) & set(second_page_ids)
        if overlap:
            log_test("Admin orders - pagination returns different orders", False, 
                     f"Found overlapping order_ids: {overlap}")
        else:
            log_test("Admin orders - pagination returns different orders", True)
    
    return all_orders

def test_admin_customers(cookies):
    """Test 3: GET /api/admin/customers - verify aggregated total_spent calculation"""
    print("\n👥 Test 3: Admin Customers with Aggregated Stats")
    
    resp = requests.get(f"{BASE_URL}/admin/customers", cookies=cookies)
    if resp.status_code != 200:
        log_test("Admin customers - status code", False, f"Status {resp.status_code}")
        return None
    
    log_test("Admin customers - status code", True)
    
    customers = resp.json()
    if not isinstance(customers, list):
        log_test("Admin customers - returns array", False, f"Expected array, got {type(customers)}")
        return None
    
    log_test("Admin customers - returns array", True)
    print(f"   Total customers: {len(customers)}")
    
    # Check required fields
    if customers:
        first_customer = customers[0]
        required_fields = ['user_id', 'name', 'email', 'phone', 'orders', 'total_spent']
        missing = [f for f in required_fields if f not in first_customer]
        if missing:
            log_test("Admin customers - required fields", False, f"Missing: {missing}")
        else:
            log_test("Admin customers - required fields", True)
    
    # Check sorted by total_spent desc
    if len(customers) >= 2:
        spent_values = [c['total_spent'] for c in customers]
        is_sorted = all(spent_values[i] >= spent_values[i+1] for i in range(len(spent_values)-1))
        log_test("Admin customers - sorted by total_spent desc", is_sorted,
                 "Customers not sorted correctly" if not is_sorted else "")
        print(f"   Top 3 spenders: {spent_values[:3]}")
    
    # Verify total_spent calculation for first customer
    if customers:
        test_customer = customers[0]
        user_id = test_customer['user_id']
        
        # Get customer's orders
        resp = requests.get(f"{BASE_URL}/admin/customers/{user_id}/orders", cookies=cookies)
        if resp.status_code == 200:
            data = resp.json()
            orders = data.get('orders', [])
            
            # Calculate total_spent manually (sum of non-cancelled orders)
            manual_total = sum(o['total'] for o in orders if o.get('status') != 'Cancelled')
            
            if abs(test_customer['total_spent'] - manual_total) < 0.01:
                log_test("Admin customers - total_spent calculation", True)
                print(f"   Verified total_spent for {test_customer['email']}: {test_customer['total_spent']}")
            else:
                log_test("Admin customers - total_spent calculation", False,
                         f"Expected {manual_total}, got {test_customer['total_spent']}")
        else:
            log_test("Admin customers - total_spent verification", False, 
                     "Could not fetch customer orders for verification")
    
    return customers

def test_customer_orders_endpoint(cookies):
    """Test 4: GET /api/admin/customers/{user_id}/orders - verify structure and limit"""
    print("\n📋 Test 4: Customer Orders Endpoint")
    
    # First get a customer
    resp = requests.get(f"{BASE_URL}/admin/customers", cookies=cookies)
    if resp.status_code != 200:
        log_test("Customer orders - get test customer", False, "Could not fetch customers")
        return
    
    customers = resp.json()
    if not customers:
        log_test("Customer orders - get test customer", False, "No customers found")
        return
    
    test_customer = customers[0]
    user_id = test_customer['user_id']
    
    # Test default request
    resp = requests.get(f"{BASE_URL}/admin/customers/{user_id}/orders", cookies=cookies)
    if resp.status_code != 200:
        log_test("Customer orders - status code", False, f"Status {resp.status_code}")
        return
    
    log_test("Customer orders - status code", True)
    
    data = resp.json()
    
    # Check structure
    if 'user' not in data or 'orders' not in data:
        log_test("Customer orders - response structure", False, 
                 f"Expected {{user, orders}}, got keys: {list(data.keys())}")
        return
    
    log_test("Customer orders - response structure", True)
    
    # Check user object
    if data['user'] and 'user_id' in data['user']:
        log_test("Customer orders - user object", True)
    else:
        log_test("Customer orders - user object", False, "Invalid user object")
    
    # Check orders array
    if isinstance(data['orders'], list):
        log_test("Customer orders - orders array", True)
        print(f"   Customer {data['user']['email']} has {len(data['orders'])} orders")
    else:
        log_test("Customer orders - orders array", False, "Orders is not an array")
    
    # Test limit parameter
    if len(data['orders']) > 2:
        resp = requests.get(f"{BASE_URL}/admin/customers/{user_id}/orders?limit=2", cookies=cookies)
        if resp.status_code == 200:
            limited_data = resp.json()
            if len(limited_data['orders']) <= 2:
                log_test("Customer orders - limit parameter", True)
            else:
                log_test("Customer orders - limit parameter", False, 
                         f"Expected max 2, got {len(limited_data['orders'])}")
        else:
            log_test("Customer orders - limit parameter", False, f"Status {resp.status_code}")

def test_offline_customers(cookies):
    """Test 5: GET /api/admin/offline-customers - verify aggregated metadata"""
    print("\n🏪 Test 5: Offline Customers Endpoint")
    
    resp = requests.get(f"{BASE_URL}/admin/offline-customers", cookies=cookies)
    if resp.status_code != 200:
        log_test("Offline customers - status code", False, f"Status {resp.status_code}")
        return None
    
    log_test("Offline customers - status code", True)
    
    customers = resp.json()
    if not isinstance(customers, list):
        log_test("Offline customers - returns array", False, f"Expected array, got {type(customers)}")
        return None
    
    log_test("Offline customers - returns array", True)
    print(f"   Total offline customers: {len(customers)}")
    
    # Check required fields
    if customers:
        first_customer = customers[0]
        required_fields = ['user_id', 'name', 'email', 'phone', 'orders', 
                          'last_ordered_at', 'last_address']
        missing = [f for f in required_fields if f not in first_customer]
        if missing:
            log_test("Offline customers - required fields", False, f"Missing: {missing}")
        else:
            log_test("Offline customers - required fields", True)
    
    # Check sorted by last_ordered_at desc
    if len(customers) >= 2:
        # Filter customers with orders
        with_orders = [c for c in customers if c.get('last_ordered_at')]
        if len(with_orders) >= 2:
            dates = [c['last_ordered_at'] for c in with_orders[:10]]
            is_sorted = all(dates[i] >= dates[i+1] for i in range(len(dates)-1))
            log_test("Offline customers - sorted by last_ordered_at desc", is_sorted,
                     "Customers not sorted correctly" if not is_sorted else "")
    
    return customers

def test_regression_endpoints(cookies):
    """Test 6: Regression tests - verify other endpoints still work"""
    print("\n🔄 Test 6: Regression Tests")
    
    # Test 6a: POST /api/admin/orders/offline
    print("   Testing offline order creation...")
    offline_order_payload = {
        "customer_name": "Test Regression Customer",
        "customer_phone": "9876543210",
        "customer_email": "",
        "items": [
            {"slug": "green-chilli", "variant_id": "250g", "qty": 1}
        ],
        "address": {
            "full_name": "Test Regression Customer",
            "phone": "9876543210",
            "line1": "Test Address Line 1",
            "city": "Hyderabad",
            "pincode": "500001",
            "landmark": "Near Test Landmark"
        },
        "payment_status": "Pending"  # Set to Pending to not affect revenue in data integrity test
    }
    
    resp = requests.post(f"{BASE_URL}/admin/orders/offline", 
                        json=offline_order_payload, cookies=cookies)
    if resp.status_code == 200:
        log_test("Regression - offline order creation", True)
        offline_order = resp.json()
        offline_order_id = offline_order.get('order_id')
        print(f"   Created offline order: {offline_order_id}")
    else:
        log_test("Regression - offline order creation", False, 
                 f"Status {resp.status_code}: {resp.text}")
        offline_order_id = None
    
    # Test 6b: PATCH /api/admin/orders/{order_id}
    if offline_order_id:
        print("   Testing order update...")
        resp = requests.patch(f"{BASE_URL}/admin/orders/{offline_order_id}",
                            json={"status": "Confirmed"}, cookies=cookies)
        if resp.status_code == 200:
            updated_order = resp.json()
            if updated_order.get('status') == 'Confirmed':
                log_test("Regression - order update", True)
            else:
                log_test("Regression - order update", False, "Status not updated")
        else:
            log_test("Regression - order update", False, f"Status {resp.status_code}")
    
    # Test 6c: GET /api/products
    print("   Testing products list...")
    resp = requests.get(f"{BASE_URL}/products")
    if resp.status_code == 200:
        products = resp.json()
        if isinstance(products, list) and len(products) >= 11:
            log_test("Regression - products list", True)
        else:
            log_test("Regression - products list", False, 
                     f"Expected array with >= 11 products, got {len(products) if isinstance(products, list) else 'not array'}")
    else:
        log_test("Regression - products list", False, f"Status {resp.status_code}")
    
    # Test 6d: PATCH /api/auth/me (profile update)
    print("   Testing profile update...")
    resp = requests.patch(f"{BASE_URL}/auth/me",
                         json={"phone": "9999999999"}, cookies=cookies)
    if resp.status_code == 200:
        log_test("Regression - profile update", True)
    else:
        log_test("Regression - profile update", False, f"Status {resp.status_code}")
    
    return offline_order_id

def test_data_integrity(cookies, initial_stats):
    """Test 7: Data integrity - create order and verify stats/customer updates"""
    print("\n🔍 Test 7: Data Integrity Verification")
    
    # Create an offline order as admin (since there's no direct customer registration)
    print("   Creating offline COD order as admin...")
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    customer_email = f"testcustomer{timestamp}@example.com"
    
    offline_order_payload = {
        "customer_name": "Test Customer Data Integrity",
        "customer_phone": "9999888877",
        "customer_email": customer_email,
        "items": [
            {"slug": "country-eggs", "variant_id": "dozen", "qty": 2}
        ],
        "address": {
            "full_name": "Test Customer Data Integrity",
            "phone": "9999888877",
            "line1": "Test Address Line 1",
            "city": "Hyderabad",
            "pincode": "500001",
            "landmark": "Near Test Landmark"
        },
        "payment_method": "cod",
        "payment_status": "Pending",
        "status": "Placed"
    }
    
    resp = requests.post(f"{BASE_URL}/admin/orders/offline", 
                        json=offline_order_payload, cookies=cookies)
    
    if resp.status_code != 200:
        log_test("Data integrity - COD order creation", False, 
                 f"Status {resp.status_code}: {resp.text}")
        return
    
    log_test("Data integrity - COD order creation", True)
    order_data = resp.json()
    order_id = order_data.get('order_id')
    order_total = order_data.get('total')
    customer_user_id = order_data.get('user_id')
    print(f"   Created order {order_id} with total ₹{order_total}")
    
    # Test 7a: Verify order appears in admin orders
    print("   Verifying order appears in admin orders...")
    resp = requests.get(f"{BASE_URL}/admin/orders", cookies=cookies)
    if resp.status_code == 200:
        orders = resp.json()
        order_found = any(o['order_id'] == order_id for o in orders)
        log_test("Data integrity - order in admin orders", order_found,
                 "Order not found in admin orders" if not order_found else "")
    else:
        log_test("Data integrity - order in admin orders", False, f"Status {resp.status_code}")
    
    # Test 7b: Verify customer's total_spent increases
    print("   Verifying customer total_spent...")
    resp = requests.get(f"{BASE_URL}/admin/customers", cookies=cookies)
    if resp.status_code == 200:
        customers = resp.json()
        customer = next((c for c in customers if c['user_id'] == customer_user_id), None)
        if customer:
            # For COD orders, total_spent should include the order (non-cancelled)
            if customer['total_spent'] >= order_total:
                log_test("Data integrity - customer total_spent updated", True)
                print(f"   Customer total_spent: ₹{customer['total_spent']}")
            else:
                log_test("Data integrity - customer total_spent updated", False,
                         f"Expected >= {order_total}, got {customer['total_spent']}")
        else:
            log_test("Data integrity - customer total_spent updated", False, 
                     "Customer not found in customers list")
    else:
        log_test("Data integrity - customer total_spent updated", False, 
                 f"Status {resp.status_code}")
    
    # Test 7c: Verify stats revenue only counts Paid orders (COD should be Pending)
    print("   Verifying stats revenue (should not include COD until Delivered)...")
    resp = requests.get(f"{BASE_URL}/admin/stats", cookies=cookies)
    if resp.status_code == 200:
        new_stats = resp.json()
        # COD order should not increase revenue until marked as Delivered
        if new_stats['revenue'] == initial_stats['revenue']:
            log_test("Data integrity - revenue excludes COD pending", True)
        else:
            log_test("Data integrity - revenue excludes COD pending", False,
                     f"Revenue changed from {initial_stats['revenue']} to {new_stats['revenue']}")
        
        # Orders count should increase
        if new_stats['orders'] > initial_stats['orders']:
            log_test("Data integrity - orders count increased", True)
        else:
            log_test("Data integrity - orders count increased", False,
                     f"Orders count: {initial_stats['orders']} -> {new_stats['orders']}")
    else:
        log_test("Data integrity - stats check", False, f"Status {resp.status_code}")
    
    # Test 7d: Mark order as Delivered and verify payment_status becomes Paid
    print("   Marking order as Delivered...")
    resp = requests.patch(f"{BASE_URL}/admin/orders/{order_id}",
                         json={"status": "Delivered"}, cookies=cookies)
    
    if resp.status_code == 200:
        updated_order = resp.json()
        if updated_order.get('payment_status') == 'Paid':
            log_test("Data integrity - COD payment_status becomes Paid on Delivered", True)
        else:
            log_test("Data integrity - COD payment_status becomes Paid on Delivered", False,
                     f"payment_status is {updated_order.get('payment_status')}")
        
        # Test 7e: Verify revenue now includes this order
        print("   Verifying revenue updated after Delivered...")
        resp = requests.get(f"{BASE_URL}/admin/stats", cookies=cookies)
        if resp.status_code == 200:
            final_stats = resp.json()
            expected_revenue = initial_stats['revenue'] + order_total
            if abs(final_stats['revenue'] - expected_revenue) < 0.01:
                log_test("Data integrity - revenue updated after Delivered", True)
                print(f"   Revenue: {initial_stats['revenue']} -> {final_stats['revenue']}")
            else:
                log_test("Data integrity - revenue updated after Delivered", False,
                         f"Expected {expected_revenue}, got {final_stats['revenue']}")
        else:
            log_test("Data integrity - revenue check", False, f"Status {resp.status_code}")
    else:
        log_test("Data integrity - mark as Delivered", False, f"Status {resp.status_code}")

def main():
    print("=" * 80)
    print("🧪 Retro Farms Backend API Test Suite - Refactored Endpoints Verification")
    print("=" * 80)
    print(f"Testing against: {BASE_URL}")
    print(f"Admin credentials: {ADMIN_EMAIL}")
    
    # Login as admin
    cookies = admin_login()
    if not cookies:
        print("\n❌ CRITICAL: Admin login failed. Cannot proceed with tests.")
        return
    
    # Run all tests
    initial_stats = test_admin_stats(cookies)
    test_admin_orders_pagination(cookies)
    test_admin_customers(cookies)
    test_customer_orders_endpoint(cookies)
    test_offline_customers(cookies)
    test_regression_endpoints(cookies)
    
    if initial_stats:
        test_data_integrity(cookies, initial_stats)
    
    # Print summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"📈 Success Rate: {tests_passed}/{tests_passed + tests_failed} ({100*tests_passed/(tests_passed+tests_failed):.1f}%)")
    
    if failures:
        print("\n❌ FAILED TESTS:")
        for i, failure in enumerate(failures, 1):
            print(f"{i}. {failure}")
    else:
        print("\n🎉 ALL TESTS PASSED!")
    
    print("=" * 80)

if __name__ == "__main__":
    main()
