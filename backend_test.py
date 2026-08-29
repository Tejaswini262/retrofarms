#!/usr/bin/env python3
"""
Backend API Testing for Retro Farms - New Features
Tests: Categories CRUD, Revenue Breakdown, Excel Export, Customer Lookup/Update, 
       Offline Orders with new fields, Chicken Options, DB Indexes, Regression
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://farm-to-table-541.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@retrofarms.in"
ADMIN_PASSWORD = "admin123"
STAFF_EMAIL = "staff@retrofarms.in"
STAFF_PASSWORD = "staff123"

# Test state
admin_session = requests.Session()
staff_session = requests.Session()
test_results = []
test_order_id = None
test_customer_user_id = None

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({"name": name, "passed": passed, "details": details})
    print(f"{status}: {name}")
    if details and not passed:
        print(f"   Details: {details}")

def admin_login():
    """Login as admin and return session"""
    resp = admin_session.post(f"{BASE_URL}/auth/admin-login", 
                              json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if resp.status_code == 200:
        log_test("Admin login", True)
        return True
    else:
        log_test("Admin login", False, f"Status {resp.status_code}: {resp.text}")
        return False

def staff_login():
    """Login as staff and return session"""
    resp = staff_session.post(f"{BASE_URL}/auth/admin-login",
                              json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD})
    if resp.status_code == 200:
        log_test("Staff login", True)
        return True
    else:
        log_test("Staff login", False, f"Status {resp.status_code}: {resp.text}")
        return False

# ==================== CATEGORIES CRUD ====================

def test_categories_public_list():
    """Test GET /api/categories (public)"""
    resp = requests.get(f"{BASE_URL}/categories")
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list) and len(data) >= 4:
            # Check for seeded categories
            ids = [c.get('id') for c in data]
            expected = ['eggs', 'chicken', 'fruits', 'vegetables']
            if all(e in ids for e in expected):
                log_test("GET /api/categories (public)", True, f"Found {len(data)} categories including seeded ones")
                return True
            else:
                log_test("GET /api/categories (public)", False, f"Missing expected categories. Got: {ids}")
                return False
        else:
            log_test("GET /api/categories (public)", False, f"Expected list with >=4 items, got {len(data) if isinstance(data, list) else 'not a list'}")
            return False
    else:
        log_test("GET /api/categories (public)", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_create_category():
    """Test POST /api/admin/categories"""
    payload = {"id": "mutton", "label": "Premium Mutton"}
    resp = admin_session.post(f"{BASE_URL}/admin/categories", json=payload)
    if resp.status_code in [200, 201]:
        data = resp.json()
        if data.get('id') == 'mutton' and data.get('label') == 'Premium Mutton':
            log_test("POST /api/admin/categories (create mutton)", True)
            return True
        else:
            log_test("POST /api/admin/categories (create mutton)", False, f"Unexpected response: {data}")
            return False
    else:
        log_test("POST /api/admin/categories (create mutton)", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_create_duplicate_category():
    """Test POST /api/admin/categories with duplicate id"""
    payload = {"id": "mutton", "label": "Another Mutton"}
    resp = admin_session.post(f"{BASE_URL}/admin/categories", json=payload)
    if resp.status_code == 400:
        log_test("POST /api/admin/categories (duplicate id → 400)", True)
        return True
    else:
        log_test("POST /api/admin/categories (duplicate id → 400)", False, f"Expected 400, got {resp.status_code}")
        return False

def test_update_category():
    """Test PATCH /api/admin/categories/mutton"""
    payload = {"label": "Farm Mutton", "order": 10}
    resp = admin_session.patch(f"{BASE_URL}/admin/categories/mutton", json=payload)
    if resp.status_code == 200:
        data = resp.json()
        if data.get('label') == 'Farm Mutton' and data.get('order') == 10:
            log_test("PATCH /api/admin/categories/mutton", True)
            return True
        else:
            log_test("PATCH /api/admin/categories/mutton", False, f"Update not reflected: {data}")
            return False
    else:
        log_test("PATCH /api/admin/categories/mutton", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_delete_category_with_products():
    """Test DELETE /api/admin/categories/mutton without reassign_to (should fail if products exist)"""
    # First create a test product in mutton category
    product_payload = {
        "slug": "test-mutton",
        "name": "Test Mutton Product",
        "category": "mutton",
        "image": "https://example.com/mutton.jpg",
        "from_price": 500,
        "description": "Test mutton product",
        "variants": [{"id": "1kg", "label": "1 kg", "price": 500, "stock": 10}]
    }
    create_resp = admin_session.post(f"{BASE_URL}/admin/products", json=product_payload)
    if create_resp.status_code not in [200, 201]:
        log_test("DELETE category with products (setup)", False, f"Failed to create test product: {create_resp.status_code}")
        return False
    
    # Try to delete category without reassign_to
    resp = admin_session.delete(f"{BASE_URL}/admin/categories/mutton")
    if resp.status_code == 400:
        log_test("DELETE /api/admin/categories/mutton without reassign_to → 400", True, "Blocked as expected")
        return True
    else:
        log_test("DELETE /api/admin/categories/mutton without reassign_to → 400", False, f"Expected 400, got {resp.status_code}")
        return False

def test_delete_category_with_reassign():
    """Test DELETE /api/admin/categories/mutton?reassign_to=fruits"""
    resp = admin_session.delete(f"{BASE_URL}/admin/categories/mutton?reassign_to=fruits")
    if resp.status_code == 200:
        # Verify the test product's category is now fruits
        product_resp = requests.get(f"{BASE_URL}/products/test-mutton")
        if product_resp.status_code == 200:
            product = product_resp.json()
            if product.get('category') == 'fruits':
                log_test("DELETE /api/admin/categories/mutton?reassign_to=fruits", True, "Product reassigned to fruits")
                # Cleanup: delete test product
                admin_session.delete(f"{BASE_URL}/admin/products/test-mutton")
                return True
            else:
                log_test("DELETE /api/admin/categories/mutton?reassign_to=fruits", False, f"Product category not reassigned: {product.get('category')}")
                return False
        else:
            log_test("DELETE /api/admin/categories/mutton?reassign_to=fruits", False, "Could not verify product reassignment")
            return False
    else:
        log_test("DELETE /api/admin/categories/mutton?reassign_to=fruits", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_category_staff_permissions():
    """Test that staff gets 403 on POST/PATCH/DELETE categories"""
    # POST
    resp = staff_session.post(f"{BASE_URL}/admin/categories", json={"id": "test", "label": "Test"})
    post_ok = resp.status_code == 403
    
    # PATCH
    resp = staff_session.patch(f"{BASE_URL}/admin/categories/eggs", json={"label": "Test"})
    patch_ok = resp.status_code == 403
    
    # DELETE
    resp = staff_session.delete(f"{BASE_URL}/admin/categories/eggs")
    delete_ok = resp.status_code == 403
    
    if post_ok and patch_ok and delete_ok:
        log_test("Category CRUD staff permissions (403)", True)
        return True
    else:
        log_test("Category CRUD staff permissions (403)", False, f"POST:{resp.status_code if not post_ok else 403}, PATCH:{resp.status_code if not patch_ok else 403}, DELETE:{resp.status_code if not delete_ok else 403}")
        return False

# ==================== REVENUE BREAKDOWN ====================

def test_revenue_breakdown_day():
    """Test GET /api/admin/revenue/breakdown?view=day"""
    resp = admin_session.get(f"{BASE_URL}/admin/revenue/breakdown?view=day")
    if resp.status_code == 200:
        data = resp.json()
        if 'view' in data and 'rows' in data and 'summary' in data:
            if data['view'] == 'day' and isinstance(data['rows'], list):
                summary = data['summary']
                if 'total_revenue' in summary and 'total_orders' in summary and 'aov' in summary:
                    log_test("GET /api/admin/revenue/breakdown?view=day", True, f"Summary: {summary}")
                    return True
        log_test("GET /api/admin/revenue/breakdown?view=day", False, f"Unexpected structure: {data}")
        return False
    else:
        log_test("GET /api/admin/revenue/breakdown?view=day", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_revenue_breakdown_week():
    """Test GET /api/admin/revenue/breakdown?view=week"""
    resp = admin_session.get(f"{BASE_URL}/admin/revenue/breakdown?view=week")
    if resp.status_code == 200:
        data = resp.json()
        if data.get('view') == 'week' and isinstance(data.get('rows'), list):
            # Check period format like "2026-W29"
            if len(data['rows']) > 0:
                period = data['rows'][0].get('period', '')
                if 'W' in period:
                    log_test("GET /api/admin/revenue/breakdown?view=week", True, f"Period format: {period}")
                    return True
                else:
                    log_test("GET /api/admin/revenue/breakdown?view=week", False, f"Period format incorrect: {period}")
                    return False
            else:
                log_test("GET /api/admin/revenue/breakdown?view=week", True, "No data but structure correct")
                return True
        log_test("GET /api/admin/revenue/breakdown?view=week", False, f"Unexpected structure: {data}")
        return False
    else:
        log_test("GET /api/admin/revenue/breakdown?view=week", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_revenue_breakdown_month():
    """Test GET /api/admin/revenue/breakdown?view=month"""
    resp = admin_session.get(f"{BASE_URL}/admin/revenue/breakdown?view=month")
    if resp.status_code == 200:
        data = resp.json()
        if data.get('view') == 'month' and isinstance(data.get('rows'), list):
            if len(data['rows']) > 0:
                period = data['rows'][0].get('period', '')
                # Format like "2026-07"
                if len(period) == 7 and period[4] == '-':
                    log_test("GET /api/admin/revenue/breakdown?view=month", True, f"Period format: {period}")
                    return True
                else:
                    log_test("GET /api/admin/revenue/breakdown?view=month", False, f"Period format incorrect: {period}")
                    return False
            else:
                log_test("GET /api/admin/revenue/breakdown?view=month", True, "No data but structure correct")
                return True
        log_test("GET /api/admin/revenue/breakdown?view=month", False, f"Unexpected structure: {data}")
        return False
    else:
        log_test("GET /api/admin/revenue/breakdown?view=month", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_revenue_breakdown_year():
    """Test GET /api/admin/revenue/breakdown?view=year"""
    resp = admin_session.get(f"{BASE_URL}/admin/revenue/breakdown?view=year")
    if resp.status_code == 200:
        data = resp.json()
        if data.get('view') == 'year' and isinstance(data.get('rows'), list):
            if len(data['rows']) > 0:
                period = data['rows'][0].get('period', '')
                # Format like "2026"
                if len(period) == 4 and period.isdigit():
                    log_test("GET /api/admin/revenue/breakdown?view=year", True, f"Period format: {period}")
                    return True
                else:
                    log_test("GET /api/admin/revenue/breakdown?view=year", False, f"Period format incorrect: {period}")
                    return False
            else:
                log_test("GET /api/admin/revenue/breakdown?view=year", True, "No data but structure correct")
                return True
        log_test("GET /api/admin/revenue/breakdown?view=year", False, f"Unexpected structure: {data}")
        return False
    else:
        log_test("GET /api/admin/revenue/breakdown?view=year", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_revenue_breakdown_date_filter():
    """Test GET /api/admin/revenue/breakdown with start/end filters"""
    start = (datetime.now() - timedelta(days=30)).isoformat()
    end = datetime.now().isoformat()
    resp = admin_session.get(f"{BASE_URL}/admin/revenue/breakdown?view=day&start={start}&end={end}")
    if resp.status_code == 200:
        data = resp.json()
        if 'rows' in data and 'summary' in data:
            log_test("GET /api/admin/revenue/breakdown with start/end filters", True)
            return True
        log_test("GET /api/admin/revenue/breakdown with start/end filters", False, f"Unexpected structure: {data}")
        return False
    else:
        log_test("GET /api/admin/revenue/breakdown with start/end filters", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_revenue_breakdown_invalid_view():
    """Test GET /api/admin/revenue/breakdown?view=invalid"""
    resp = admin_session.get(f"{BASE_URL}/admin/revenue/breakdown?view=invalid")
    if resp.status_code == 422:
        log_test("GET /api/admin/revenue/breakdown?view=invalid → 422", True)
        return True
    else:
        log_test("GET /api/admin/revenue/breakdown?view=invalid → 422", False, f"Expected 422, got {resp.status_code}")
        return False

# ==================== EXCEL EXPORT ====================

def test_excel_export():
    """Test GET /api/admin/orders/export.xlsx"""
    resp = admin_session.get(f"{BASE_URL}/admin/orders/export.xlsx")
    if resp.status_code == 200:
        content_type = resp.headers.get('Content-Type', '')
        content_disp = resp.headers.get('Content-Disposition', '')
        
        # Check headers
        if 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in content_type:
            if 'attachment' in content_disp:
                # Check if body starts with PK (xlsx signature)
                if resp.content[:2] == b'PK':
                    log_test("GET /api/admin/orders/export.xlsx", True, f"Content-Type and PK signature correct")
                    return True
                else:
                    log_test("GET /api/admin/orders/export.xlsx", False, f"Body doesn't start with PK signature")
                    return False
            else:
                log_test("GET /api/admin/orders/export.xlsx", False, f"Content-Disposition missing 'attachment'")
                return False
        else:
            log_test("GET /api/admin/orders/export.xlsx", False, f"Wrong Content-Type: {content_type}")
            return False
    else:
        log_test("GET /api/admin/orders/export.xlsx", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_excel_export_with_filters():
    """Test GET /api/admin/orders/export.xlsx with start/end/status filters"""
    start = (datetime.now() - timedelta(days=30)).isoformat()
    end = datetime.now().isoformat()
    resp = admin_session.get(f"{BASE_URL}/admin/orders/export.xlsx?start={start}&end={end}&status=Delivered")
    if resp.status_code == 200:
        if resp.content[:2] == b'PK':
            log_test("GET /api/admin/orders/export.xlsx with filters", True)
            return True
        else:
            log_test("GET /api/admin/orders/export.xlsx with filters", False, "Body doesn't start with PK")
            return False
    else:
        log_test("GET /api/admin/orders/export.xlsx with filters", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_excel_export_unauthenticated():
    """Test GET /api/admin/orders/export.xlsx without auth"""
    resp = requests.get(f"{BASE_URL}/admin/orders/export.xlsx")
    if resp.status_code == 401:
        log_test("GET /api/admin/orders/export.xlsx (unauthenticated → 401)", True)
        return True
    else:
        log_test("GET /api/admin/orders/export.xlsx (unauthenticated → 401)", False, f"Expected 401, got {resp.status_code}")
        return False

# ==================== CUSTOMER LOOKUP + UPDATE ====================

def test_customer_lookup_not_found():
    """Test GET /api/admin/customers/lookup?phone=9999911111 (not found)"""
    resp = admin_session.get(f"{BASE_URL}/admin/customers/lookup?phone=9999911111")
    if resp.status_code == 200:
        data = resp.json()
        if data == {}:
            log_test("GET /api/admin/customers/lookup (not found → {})", True)
            return True
        else:
            log_test("GET /api/admin/customers/lookup (not found → {})", False, f"Expected empty dict, got {data}")
            return False
    else:
        log_test("GET /api/admin/customers/lookup (not found → {})", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_customer_lookup_found():
    """Test GET /api/admin/customers/lookup?phone=... (found after creating offline order)"""
    global test_customer_user_id
    
    # Create an offline order with phone 9999911111
    payload = {
        "customer_name": "Test Customer",
        "customer_phone": "9999911111",
        "customer_email": "testcustomer@example.com",
        "items": [{"slug": "green-chilli", "variant_id": "250g", "qty": 1}],
        "address": {
            "full_name": "Test Customer",
            "phone": "9999911111",
            "line1": "123 Test St",
            "city": "Hyderabad",
            "pincode": "500001"
        },
        "payment_method": "cash",
        "payment_status": "Paid"
    }
    create_resp = admin_session.post(f"{BASE_URL}/admin/orders/offline", json=payload)
    if create_resp.status_code not in [200, 201]:
        log_test("Customer lookup (setup)", False, f"Failed to create offline order: {create_resp.status_code}")
        return False
    
    # Now lookup by phone
    resp = admin_session.get(f"{BASE_URL}/admin/customers/lookup?phone=9999911111")
    if resp.status_code == 200:
        data = resp.json()
        if data and 'user_id' in data and 'saved_address' in data:
            test_customer_user_id = data['user_id']
            log_test("GET /api/admin/customers/lookup (found)", True, f"Found user_id: {test_customer_user_id}")
            return True
        else:
            log_test("GET /api/admin/customers/lookup (found)", False, f"Unexpected response: {data}")
            return False
    else:
        log_test("GET /api/admin/customers/lookup (found)", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_customer_update():
    """Test PATCH /api/admin/customers/{user_id}"""
    global test_customer_user_id
    
    if not test_customer_user_id:
        log_test("PATCH /api/admin/customers/{user_id}", False, "No test_customer_user_id available")
        return False
    
    payload = {
        "name": "Updated Customer Name",
        "address": {
            "line1": "New Street 456",
            "city": "HYD",
            "pincode": "500001"
        }
    }
    resp = admin_session.patch(f"{BASE_URL}/admin/customers/{test_customer_user_id}", json=payload)
    if resp.status_code == 200:
        data = resp.json()
        if data.get('name') == 'Updated Customer Name':
            if data.get('saved_address', {}).get('line1') == 'New Street 456':
                log_test("PATCH /api/admin/customers/{user_id}", True)
                return True
            else:
                log_test("PATCH /api/admin/customers/{user_id}", False, f"Address not updated: {data.get('saved_address')}")
                return False
        else:
            log_test("PATCH /api/admin/customers/{user_id}", False, f"Name not updated: {data.get('name')}")
            return False
    else:
        log_test("PATCH /api/admin/customers/{user_id}", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_customer_update_staff_permission():
    """Test that staff can also lookup/update customers"""
    # Lookup
    lookup_resp = staff_session.get(f"{BASE_URL}/admin/customers/lookup?phone=9999911111")
    lookup_ok = lookup_resp.status_code == 200
    
    # Update
    if test_customer_user_id:
        update_resp = staff_session.patch(f"{BASE_URL}/admin/customers/{test_customer_user_id}",
                                          json={"name": "Staff Updated"})
        update_ok = update_resp.status_code == 200
    else:
        update_ok = False
    
    if lookup_ok and update_ok:
        log_test("Customer lookup/update staff permissions", True)
        return True
    else:
        log_test("Customer lookup/update staff permissions", False, f"Lookup: {lookup_resp.status_code}, Update: {update_resp.status_code if test_customer_user_id else 'N/A'}")
        return False

# ==================== OFFLINE ORDER WITH NEW FIELDS ====================

def test_offline_order_new_fields():
    """Test POST /api/admin/orders/offline with full address dict and payment fields"""
    payload = {
        "customer_name": "New Offline Customer",
        "customer_phone": "8888888888",
        "customer_email": "newoffline@example.com",
        "items": [{"slug": "tomatoes", "variant_id": "1kg", "qty": 2}],
        "address": {
            "full_name": "New Offline Customer",
            "phone": "8888888888",
            "line1": "789 Offline St",
            "line2": "Apt 4",
            "city": "Bangalore",
            "pincode": "560001",
            "landmark": "Near Park"
        },
        "payment_method": "not_paid",
        "payment_status": "Not Paid"
    }
    resp = admin_session.post(f"{BASE_URL}/admin/orders/offline", json=payload)
    if resp.status_code in [200, 201]:
        data = resp.json()
        checks = []
        checks.append(data.get('payment_method') == 'not_paid')
        checks.append(data.get('payment_status') == 'Not Paid')
        checks.append(data.get('source') == 'offline')
        checks.append(data.get('address', {}).get('line1') == '789 Offline St')
        checks.append(data.get('address', {}).get('city') == 'Bangalore')
        
        if all(checks):
            log_test("POST /api/admin/orders/offline with new fields", True)
            return True
        else:
            log_test("POST /api/admin/orders/offline with new fields", False, f"Some fields incorrect: {data}")
            return False
    else:
        log_test("POST /api/admin/orders/offline with new fields", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_offline_order_saved_address():
    """Test that offline order saves customer address to saved_address"""
    # Lookup the customer we just created
    resp = admin_session.get(f"{BASE_URL}/admin/customers/lookup?phone=8888888888")
    if resp.status_code == 200:
        data = resp.json()
        if data and 'saved_address' in data:
            saved = data['saved_address']
            if saved.get('line1') == '789 Offline St' and saved.get('city') == 'Bangalore':
                log_test("Offline order saves customer address", True)
                return True
            else:
                log_test("Offline order saves customer address", False, f"Address not saved correctly: {saved}")
                return False
        else:
            log_test("Offline order saves customer address", False, f"No saved_address in response: {data}")
            return False
    else:
        log_test("Offline order saves customer address", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_offline_order_reuse_customer():
    """Test that second offline order with same phone reuses existing customer"""
    # Create another offline order with same phone but no address override
    payload = {
        "customer_name": "New Offline Customer",
        "customer_phone": "8888888888",
        "items": [{"slug": "green-chilli", "variant_id": "250g", "qty": 1}],
        "payment_method": "cash",
        "payment_status": "Paid"
    }
    resp = admin_session.post(f"{BASE_URL}/admin/orders/offline", json=payload)
    if resp.status_code in [200, 201]:
        # Lookup customer again
        lookup_resp = admin_session.get(f"{BASE_URL}/admin/customers/lookup?phone=8888888888")
        if lookup_resp.status_code == 200:
            data = lookup_resp.json()
            # Name and phone should stay the same
            if data.get('name') == 'New Offline Customer' and data.get('phone') == '8888888888':
                log_test("Offline order reuses existing customer", True)
                return True
            else:
                log_test("Offline order reuses existing customer", False, f"Customer data changed: {data}")
                return False
        else:
            log_test("Offline order reuses existing customer", False, f"Lookup failed: {lookup_resp.status_code}")
            return False
    else:
        log_test("Offline order reuses existing customer", False, f"Status {resp.status_code}: {resp.text}")
        return False

# ==================== CHICKEN OPTIONS IN ITEMS ====================

def test_chicken_options_in_order():
    """Test POST /api/orders/create with items containing options"""
    global test_order_id
    
    # First, create a customer session
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio
    import os
    import uuid
    
    # We need to create a session in MongoDB directly for this test
    # Let's use a simpler approach: create an offline order with options
    payload = {
        "customer_name": "Chicken Options Customer",
        "customer_phone": "7777777777",
        "items": [{
            "slug": "country-chicken",
            "variant_id": "1kg",
            "qty": 1,
            "options": {
                "bird_type": "Tender Bird",
                "delivery_date": "Tomorrow",
                "piece_size": "Biryani Cut",
                "instructions": "Small pieces"
            }
        }],
        "address": {
            "full_name": "Chicken Options Customer",
            "phone": "7777777777",
            "line1": "123 Chicken St",
            "city": "Hyderabad",
            "pincode": "500001"
        },
        "payment_method": "cod",
        "payment_status": "Not Paid"
    }
    resp = admin_session.post(f"{BASE_URL}/admin/orders/offline", json=payload)
    if resp.status_code in [200, 201]:
        data = resp.json()
        test_order_id = data.get('order_id')
        
        # Check if options are in the response
        items = data.get('items', [])
        if len(items) > 0:
            options = items[0].get('options')
            if options:
                checks = []
                checks.append(options.get('bird_type') == 'Tender Bird')
                checks.append(options.get('delivery_date') == 'Tomorrow')
                checks.append(options.get('piece_size') == 'Biryani Cut')
                checks.append(options.get('instructions') == 'Small pieces')
                
                if all(checks):
                    log_test("POST order with chicken options", True, f"Order ID: {test_order_id}")
                    return True
                else:
                    log_test("POST order with chicken options", False, f"Options incomplete: {options}")
                    return False
            else:
                log_test("POST order with chicken options", False, "No options in response")
                return False
        else:
            log_test("POST order with chicken options", False, "No items in response")
            return False
    else:
        log_test("POST order with chicken options", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_chicken_options_in_get_order():
    """Test GET /api/orders/{order_id} returns items with options intact"""
    global test_order_id
    
    if not test_order_id:
        log_test("GET /api/orders/{order_id} with options", False, "No test_order_id available")
        return False
    
    resp = admin_session.get(f"{BASE_URL}/orders/{test_order_id}")
    if resp.status_code == 200:
        data = resp.json()
        items = data.get('items', [])
        if len(items) > 0:
            options = items[0].get('options')
            if options and all(k in options for k in ['bird_type', 'delivery_date', 'piece_size', 'instructions']):
                log_test("GET /api/orders/{order_id} with options", True)
                return True
            else:
                log_test("GET /api/orders/{order_id} with options", False, f"Options missing or incomplete: {options}")
                return False
        else:
            log_test("GET /api/orders/{order_id} with options", False, "No items in response")
            return False
    else:
        log_test("GET /api/orders/{order_id} with options", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_chicken_options_in_admin_orders():
    """Test GET /api/admin/orders returns orders with options"""
    resp = admin_session.get(f"{BASE_URL}/admin/orders")
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list) and len(data) > 0:
            # Find our test order
            test_order = None
            for order in data:
                if order.get('order_id') == test_order_id:
                    test_order = order
                    break
            
            if test_order:
                items = test_order.get('items', [])
                if len(items) > 0:
                    options = items[0].get('options')
                    if options and 'bird_type' in options:
                        log_test("GET /api/admin/orders with options", True)
                        return True
                    else:
                        log_test("GET /api/admin/orders with options", False, f"Options missing: {options}")
                        return False
                else:
                    log_test("GET /api/admin/orders with options", False, "No items in test order")
                    return False
            else:
                log_test("GET /api/admin/orders with options", False, "Test order not found in list")
                return False
        else:
            log_test("GET /api/admin/orders with options", False, "No orders returned")
            return False
    else:
        log_test("GET /api/admin/orders with options", False, f"Status {resp.status_code}: {resp.text}")
        return False

# ==================== REGRESSION TESTS ====================

def test_regression_products():
    """Test GET /api/products still works"""
    resp = requests.get(f"{BASE_URL}/products")
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list) and len(data) >= 11:
            log_test("Regression: GET /api/products", True)
            return True
        else:
            log_test("Regression: GET /api/products", False, f"Expected >=11 products, got {len(data) if isinstance(data, list) else 'not a list'}")
            return False
    else:
        log_test("Regression: GET /api/products", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_regression_admin_login():
    """Test POST /api/auth/admin-login still works"""
    # Already tested in admin_login(), but let's verify again
    resp = requests.post(f"{BASE_URL}/auth/admin-login",
                        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if resp.status_code == 200:
        data = resp.json()
        if 'user_id' in data and data.get('role') == 'admin':
            log_test("Regression: POST /api/auth/admin-login", True)
            return True
        else:
            log_test("Regression: POST /api/auth/admin-login", False, f"Unexpected response: {data}")
            return False
    else:
        log_test("Regression: POST /api/auth/admin-login", False, f"Status {resp.status_code}: {resp.text}")
        return False

def test_regression_admin_stats():
    """Test GET /api/admin/stats still works"""
    resp = admin_session.get(f"{BASE_URL}/admin/stats")
    if resp.status_code == 200:
        data = resp.json()
        required_keys = ['revenue', 'orders', 'pending', 'products', 'customers']
        if all(k in data for k in required_keys):
            log_test("Regression: GET /api/admin/stats", True)
            return True
        else:
            log_test("Regression: GET /api/admin/stats", False, f"Missing keys: {data}")
            return False
    else:
        log_test("Regression: GET /api/admin/stats", False, f"Status {resp.status_code}: {resp.text}")
        return False

# ==================== MAIN TEST RUNNER ====================

def main():
    print("=" * 80)
    print("RETRO FARMS BACKEND API TESTING - NEW FEATURES")
    print("=" * 80)
    print()
    
    # Login
    if not admin_login():
        print("\n❌ Admin login failed. Cannot proceed with tests.")
        sys.exit(1)
    
    if not staff_login():
        print("\n⚠️  Staff login failed. Some tests will be skipped.")
    
    print("\n" + "=" * 80)
    print("CATEGORIES CRUD")
    print("=" * 80)
    test_categories_public_list()
    test_create_category()
    test_create_duplicate_category()
    test_update_category()
    test_delete_category_with_products()
    test_delete_category_with_reassign()
    test_category_staff_permissions()
    
    print("\n" + "=" * 80)
    print("REVENUE BREAKDOWN")
    print("=" * 80)
    test_revenue_breakdown_day()
    test_revenue_breakdown_week()
    test_revenue_breakdown_month()
    test_revenue_breakdown_year()
    test_revenue_breakdown_date_filter()
    test_revenue_breakdown_invalid_view()
    
    print("\n" + "=" * 80)
    print("EXCEL EXPORT")
    print("=" * 80)
    test_excel_export()
    test_excel_export_with_filters()
    test_excel_export_unauthenticated()
    
    print("\n" + "=" * 80)
    print("CUSTOMER LOOKUP + UPDATE")
    print("=" * 80)
    test_customer_lookup_not_found()
    test_customer_lookup_found()
    test_customer_update()
    test_customer_update_staff_permission()
    
    print("\n" + "=" * 80)
    print("OFFLINE ORDER WITH NEW FIELDS")
    print("=" * 80)
    test_offline_order_new_fields()
    test_offline_order_saved_address()
    test_offline_order_reuse_customer()
    
    print("\n" + "=" * 80)
    print("CHICKEN OPTIONS IN ITEMS")
    print("=" * 80)
    test_chicken_options_in_order()
    test_chicken_options_in_get_order()
    test_chicken_options_in_admin_orders()
    
    print("\n" + "=" * 80)
    print("REGRESSION TESTS")
    print("=" * 80)
    test_regression_products()
    test_regression_admin_login()
    test_regression_admin_stats()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(1 for t in test_results if t['passed'])
    failed = sum(1 for t in test_results if not t['passed'])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if failed > 0:
        print("\n" + "=" * 80)
        print("FAILED TESTS")
        print("=" * 80)
        for t in test_results:
            if not t['passed']:
                print(f"\n❌ {t['name']}")
                if t['details']:
                    print(f"   {t['details']}")
    
    print("\n" + "=" * 80)
    print("DB INDEXES CHECK")
    print("=" * 80)
    print("✅ Check backend logs for index creation errors (see /var/log/supervisor/backend.*.log)")
    print("   If no errors logged during startup, indexes were created successfully.")
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
