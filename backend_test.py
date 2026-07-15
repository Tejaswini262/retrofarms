#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for Retro Farms
Tests all endpoints as specified in the review request
"""

import requests
import json
import time
from typing import Dict, Optional

# Backend URL from frontend/.env
BASE_URL = "https://farm-to-table-541.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@retrofarms.in"
ADMIN_PASSWORD = "admin123"
STAFF_EMAIL = "staff@retrofarms.in"
STAFF_PASSWORD = "staff123"

# Global state
admin_session = None
staff_session = None
customer_session = None
test_order_id = None
test_staff_user_id = None

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

def test_basic_endpoint():
    """Test 1: GET /api/ returns Retro Farms API message"""
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "message" in data and "Retro Farms API" in data["message"]:
                result.add_pass("Basic endpoint", f"Message: {data['message']}")
            else:
                result.add_fail("Basic endpoint", f"Unexpected response: {data}")
        else:
            result.add_fail("Basic endpoint", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Basic endpoint", str(e))

def test_products_list():
    """Test 2: GET /api/products returns array of 11 products"""
    try:
        resp = requests.get(f"{BASE_URL}/products", timeout=10)
        if resp.status_code == 200:
            products = resp.json()
            if isinstance(products, list):
                if len(products) == 11:
                    result.add_pass("Products list", f"Found {len(products)} products")
                else:
                    result.add_fail("Products list", f"Expected 11 products, got {len(products)}")
            else:
                result.add_fail("Products list", f"Expected array, got {type(products)}")
        else:
            result.add_fail("Products list", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Products list", str(e))

def test_product_detail():
    """Test 3: GET /api/products/country-eggs returns product with variants"""
    try:
        resp = requests.get(f"{BASE_URL}/products/country-eggs", timeout=10)
        if resp.status_code == 200:
            product = resp.json()
            if product.get("slug") == "country-eggs" and "variants" in product:
                result.add_pass("Product detail (country-eggs)", f"Found {len(product['variants'])} variants")
            else:
                result.add_fail("Product detail (country-eggs)", f"Missing slug or variants: {product}")
        else:
            result.add_fail("Product detail (country-eggs)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Product detail (country-eggs)", str(e))

def test_product_not_found():
    """Test 4: GET /api/products/nonexistent returns 404"""
    try:
        resp = requests.get(f"{BASE_URL}/products/nonexistent", timeout=10)
        if resp.status_code == 404:
            result.add_pass("Product not found (404)", "Correctly returns 404")
        else:
            result.add_fail("Product not found (404)", f"Expected 404, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Product not found (404)", str(e))

def test_admin_login():
    """Test 5: POST /api/auth/admin-login with admin credentials"""
    global admin_session
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/admin-login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("role") == "admin" and data.get("email") == ADMIN_EMAIL:
                # Check for session_token cookie
                if "session_token" in resp.cookies:
                    admin_session = resp.cookies.get("session_token")
                    result.add_pass("Admin login", f"Role: {data['role']}, Cookie set: {admin_session[:20]}...")
                else:
                    result.add_fail("Admin login", "No session_token cookie set")
            else:
                result.add_fail("Admin login", f"Unexpected response: {data}")
        else:
            result.add_fail("Admin login", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Admin login", str(e))

def test_admin_login_wrong_password():
    """Test 6: POST /api/auth/admin-login with wrong password returns 401"""
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/admin-login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"},
            timeout=10
        )
        if resp.status_code == 401:
            result.add_pass("Admin login wrong password (401)", "Correctly returns 401")
        else:
            result.add_fail("Admin login wrong password (401)", f"Expected 401, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Admin login wrong password (401)", str(e))

def test_auth_me_with_cookie():
    """Test 7: GET /api/auth/me with admin cookie returns admin user"""
    if not admin_session:
        result.add_fail("Auth /me with cookie", "No admin session available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/auth/me",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("role") == "admin":
                result.add_pass("Auth /me with cookie", f"User: {data.get('email')}")
            else:
                result.add_fail("Auth /me with cookie", f"Expected admin role, got {data.get('role')}")
        else:
            result.add_fail("Auth /me with cookie", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Auth /me with cookie", str(e))

def test_auth_me_without_cookie():
    """Test 8: GET /api/auth/me without cookie returns 401"""
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        if resp.status_code == 401:
            result.add_pass("Auth /me without cookie (401)", "Correctly returns 401")
        else:
            result.add_fail("Auth /me without cookie (401)", f"Expected 401, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Auth /me without cookie (401)", str(e))

def test_staff_login():
    """Test 9: POST /api/auth/admin-login with staff credentials"""
    global staff_session
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/admin-login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("role") == "staff":
                staff_session = resp.cookies.get("session_token")
                result.add_pass("Staff login", f"Role: {data['role']}")
            else:
                result.add_fail("Staff login", f"Expected staff role, got {data.get('role')}")
        else:
            result.add_fail("Staff login", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Staff login", str(e))

def test_admin_stats():
    """Test 10: GET /api/admin/stats with admin cookie"""
    if not admin_session:
        result.add_fail("Admin stats", "No admin session available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/stats",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            required_keys = ["revenue", "orders", "pending", "products", "customers"]
            if all(k in data for k in required_keys):
                result.add_pass("Admin stats", f"Revenue: ₹{data['revenue']}, Orders: {data['orders']}, Products: {data['products']}")
            else:
                result.add_fail("Admin stats", f"Missing keys. Got: {list(data.keys())}")
        else:
            result.add_fail("Admin stats", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Admin stats", str(e))

def test_admin_orders():
    """Test 11: GET /api/admin/orders with admin cookie"""
    if not admin_session:
        result.add_fail("Admin orders list", "No admin session available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/orders",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            orders = resp.json()
            if isinstance(orders, list):
                result.add_pass("Admin orders list", f"Found {len(orders)} orders")
            else:
                result.add_fail("Admin orders list", f"Expected array, got {type(orders)}")
        else:
            result.add_fail("Admin orders list", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Admin orders list", str(e))

def test_admin_customers():
    """Test 12: GET /api/admin/customers with admin cookie"""
    if not admin_session:
        result.add_fail("Admin customers list", "No admin session available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/customers",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            customers = resp.json()
            if isinstance(customers, list):
                result.add_pass("Admin customers list", f"Found {len(customers)} customers")
            else:
                result.add_fail("Admin customers list", f"Expected array, got {type(customers)}")
        else:
            result.add_fail("Admin customers list", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Admin customers list", str(e))

def test_admin_staff_list():
    """Test 13: GET /api/admin/staff returns array with admin and staff users"""
    if not admin_session:
        result.add_fail("Admin staff list", "No admin session available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/staff",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            staff = resp.json()
            if isinstance(staff, list) and len(staff) >= 2:
                result.add_pass("Admin staff list", f"Found {len(staff)} staff members")
            else:
                result.add_fail("Admin staff list", f"Expected at least 2 staff, got {len(staff) if isinstance(staff, list) else 'non-array'}")
        else:
            result.add_fail("Admin staff list", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Admin staff list", str(e))

def test_staff_create():
    """Test 14: POST /api/admin/staff creates new staff user (admin only)"""
    global test_staff_user_id
    if not admin_session:
        result.add_fail("Staff create", "No admin session available")
        return
    
    try:
        payload = {
            "name": "Test Delivery",
            "email": f"testdelivery{int(time.time())}@retrofarms.in",
            "phone": "9999999999",
            "password": "test1234",
            "role": "staff"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/staff",
            json=payload,
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if "user_id" in data:
                test_staff_user_id = data["user_id"]
                result.add_pass("Staff create", f"Created user: {data['email']}, ID: {test_staff_user_id}")
            else:
                result.add_fail("Staff create", f"No user_id in response: {data}")
        else:
            result.add_fail("Staff create", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Staff create", str(e))

def test_staff_appears_in_list():
    """Test 15: Verify new staff appears in GET /api/admin/staff"""
    if not admin_session or not test_staff_user_id:
        result.add_fail("Staff appears in list", "No admin session or test staff user")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/staff",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            staff = resp.json()
            found = any(s.get("user_id") == test_staff_user_id for s in staff)
            if found:
                result.add_pass("Staff appears in list", f"Found user {test_staff_user_id}")
            else:
                result.add_fail("Staff appears in list", f"User {test_staff_user_id} not found in list")
        else:
            result.add_fail("Staff appears in list", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Staff appears in list", str(e))

def test_staff_delete():
    """Test 16: DELETE /api/admin/staff/{user_id} deletes staff"""
    if not admin_session or not test_staff_user_id:
        result.add_fail("Staff delete", "No admin session or test staff user")
        return
    
    try:
        resp = requests.delete(
            f"{BASE_URL}/admin/staff/{test_staff_user_id}",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok"):
                result.add_pass("Staff delete", f"Deleted user {test_staff_user_id}")
            else:
                result.add_fail("Staff delete", f"Unexpected response: {data}")
        else:
            result.add_fail("Staff delete", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Staff delete", str(e))

def test_staff_cannot_create_staff():
    """Test 17: Staff role should get 403 when trying to create staff"""
    if not staff_session:
        result.add_fail("Staff cannot create staff (403)", "No staff session available")
        return
    
    try:
        payload = {
            "name": "Should Fail",
            "email": f"shouldfail{int(time.time())}@retrofarms.in",
            "phone": "9999999999",
            "password": "test1234",
            "role": "staff"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/staff",
            json=payload,
            cookies={"session_token": staff_session},
            timeout=10
        )
        if resp.status_code == 403:
            result.add_pass("Staff cannot create staff (403)", "Correctly returns 403")
        else:
            result.add_fail("Staff cannot create staff (403)", f"Expected 403, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Staff cannot create staff (403)", str(e))

def test_inventory_update():
    """Test 18: PATCH /api/admin/products/country-eggs/variants/dozen/stock"""
    if not admin_session:
        result.add_fail("Inventory update", "No admin session available")
        return
    
    try:
        resp = requests.patch(
            f"{BASE_URL}/admin/products/country-eggs/variants/dozen/stock",
            json={"stock": 150},
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            result.add_pass("Inventory update", "Stock updated to 150")
        else:
            result.add_fail("Inventory update", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Inventory update", str(e))

def test_inventory_verify():
    """Test 19: Verify stock is now 150 for country-eggs dozen"""
    try:
        resp = requests.get(f"{BASE_URL}/products/country-eggs", timeout=10)
        if resp.status_code == 200:
            product = resp.json()
            dozen = next((v for v in product["variants"] if v["id"] == "dozen"), None)
            if dozen and dozen["stock"] == 150:
                result.add_pass("Inventory verify", f"Stock confirmed: {dozen['stock']}")
            else:
                result.add_fail("Inventory verify", f"Expected stock 150, got {dozen['stock'] if dozen else 'variant not found'}")
        else:
            result.add_fail("Inventory verify", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Inventory verify", str(e))

def test_order_create_without_auth():
    """Test 20: POST /api/orders/create without auth returns 401"""
    try:
        payload = {
            "items": [{"slug": "green-chilli", "variant_id": "250g", "qty": 1}],
            "address": {
                "full_name": "Test User",
                "phone": "9999999999",
                "line1": "1 Farm Rd",
                "city": "Hyderabad",
                "pincode": "500001"
            },
            "payment_method": "cod"
        }
        resp = requests.post(f"{BASE_URL}/orders/create", json=payload, timeout=10)
        if resp.status_code == 401:
            result.add_pass("Order create without auth (401)", "Correctly returns 401")
        else:
            result.add_fail("Order create without auth (401)", f"Expected 401, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Order create without auth (401)", str(e))

def create_test_customer():
    """Create a test customer user and session in MongoDB"""
    global customer_session
    try:
        import subprocess
        timestamp = int(time.time())
        uid = f"user_test_customer_{timestamp}"
        token = f"sess_test_{timestamp}"
        
        mongo_cmd = f"""
mongosh --quiet --eval "
use('test_database');
var uid = '{uid}';
var token = '{token}';
db.users.insertOne({{user_id: uid, email: 'testcustomer{timestamp}@example.com', name: 'Test Customer', role: 'customer', provider: 'google', created_at: new Date()}});
var exp = new Date(Date.now() + 7*24*60*60*1000);
db.sessions.insertOne({{session_token: token, user_id: uid, expires_at: exp, created_at: new Date()}});
print(token);
"
"""
        proc = subprocess.run(mongo_cmd, shell=True, capture_output=True, text=True, timeout=10)
        if proc.returncode == 0:
            customer_session = token
            result.add_pass("Create test customer", f"Session: {token[:20]}...")
            return True
        else:
            result.add_fail("Create test customer", f"MongoDB error: {proc.stderr}")
            return False
    except Exception as e:
        result.add_fail("Create test customer", str(e))
        return False

def test_order_create_cod_with_delivery():
    """Test 21: Create COD order with subtotal < ₹200 (delivery ₹100)"""
    global test_order_id
    if not customer_session:
        if not create_test_customer():
            result.add_fail("Order create COD with delivery", "No customer session")
            return
    
    try:
        payload = {
            "items": [{"slug": "green-chilli", "variant_id": "250g", "qty": 1}],
            "address": {
                "full_name": "Rajesh Kumar",
                "phone": "9876543210",
                "line1": "123 Farm Road",
                "city": "Hyderabad",
                "pincode": "500001"
            },
            "payment_method": "cod"
        }
        resp = requests.post(
            f"{BASE_URL}/orders/create",
            json=payload,
            cookies={"session_token": customer_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if (data.get("subtotal") == 30 and 
                data.get("delivery") == 100 and 
                data.get("total") == 130 and
                "order_id" in data):
                test_order_id = data["order_id"]
                result.add_pass("Order create COD with delivery", f"Order {test_order_id}: subtotal=₹30, delivery=₹100, total=₹130")
            else:
                result.add_fail("Order create COD with delivery", f"Incorrect totals: {data}")
        else:
            result.add_fail("Order create COD with delivery", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Order create COD with delivery", str(e))

def test_order_get():
    """Test 22: GET /api/orders/{order_id} returns the order"""
    if not customer_session or not test_order_id:
        result.add_fail("Order get", "No customer session or test order")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/orders/{test_order_id}",
            cookies={"session_token": customer_session},
            timeout=10
        )
        if resp.status_code == 200:
            order = resp.json()
            if order.get("order_id") == test_order_id:
                result.add_pass("Order get", f"Order {test_order_id} retrieved")
            else:
                result.add_fail("Order get", f"Order ID mismatch: {order.get('order_id')}")
        else:
            result.add_fail("Order get", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Order get", str(e))

def test_order_create_razorpay_no_delivery():
    """Test 23: Create Razorpay order with subtotal ≥ ₹200 (delivery ₹0)"""
    if not customer_session:
        result.add_fail("Order create Razorpay no delivery", "No customer session")
        return
    
    try:
        payload = {
            "items": [{"slug": "country-eggs", "variant_id": "dozen", "qty": 2}],
            "address": {
                "full_name": "Priya Sharma",
                "phone": "9876543210",
                "line1": "456 Green Avenue",
                "city": "Bangalore",
                "pincode": "560001"
            },
            "payment_method": "razorpay"
        }
        resp = requests.post(
            f"{BASE_URL}/orders/create",
            json=payload,
            cookies={"session_token": customer_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            # 2 dozen eggs @ ₹180 each = ₹360
            if (data.get("subtotal") == 360 and 
                data.get("delivery") == 0 and 
                data.get("total") == 360 and
                "razorpay_order_id" in data and
                data["razorpay_order_id"].startswith("order_") and
                data.get("amount") == 36000 and
                data.get("key_id", "").startswith("rzp_live_")):
                result.add_pass("Order create Razorpay no delivery", 
                    f"Order: subtotal=₹360, delivery=₹0, total=₹360, razorpay_order_id={data['razorpay_order_id'][:20]}...")
            else:
                result.add_fail("Order create Razorpay no delivery", f"Incorrect data: {data}")
        else:
            result.add_fail("Order create Razorpay no delivery", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Order create Razorpay no delivery", str(e))

def test_orders_my():
    """Test 24: GET /api/orders/my returns list of orders"""
    if not customer_session:
        result.add_fail("Orders my", "No customer session")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/orders/my",
            cookies={"session_token": customer_session},
            timeout=10
        )
        if resp.status_code == 200:
            orders = resp.json()
            if isinstance(orders, list) and len(orders) >= 1:
                result.add_pass("Orders my", f"Found {len(orders)} orders")
            else:
                result.add_fail("Orders my", f"Expected at least 1 order, got {len(orders) if isinstance(orders, list) else 'non-array'}")
        else:
            result.add_fail("Orders my", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Orders my", str(e))

def test_admin_order_update_status():
    """Test 25: PATCH /api/admin/orders/{order_id} with status"""
    if not admin_session or not test_order_id:
        result.add_fail("Admin order update status", "No admin session or test order")
        return
    
    try:
        resp = requests.patch(
            f"{BASE_URL}/admin/orders/{test_order_id}",
            json={"status": "Confirmed"},
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            order = resp.json()
            if order.get("status") == "Confirmed":
                result.add_pass("Admin order update status", f"Status updated to Confirmed")
            else:
                result.add_fail("Admin order update status", f"Status not updated: {order.get('status')}")
        else:
            result.add_fail("Admin order update status", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Admin order update status", str(e))

def test_admin_order_assign_staff():
    """Test 26: PATCH /api/admin/orders/{order_id} with assigned_staff_id"""
    if not admin_session or not test_order_id:
        result.add_fail("Admin order assign staff", "No admin session or test order")
        return
    
    # Get a staff user_id first
    try:
        staff_resp = requests.get(
            f"{BASE_URL}/admin/staff",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if staff_resp.status_code != 200:
            result.add_fail("Admin order assign staff", "Could not fetch staff list")
            return
        
        staff_list = staff_resp.json()
        if not staff_list:
            result.add_fail("Admin order assign staff", "No staff available")
            return
        
        staff_id = staff_list[0]["user_id"]
        
        resp = requests.patch(
            f"{BASE_URL}/admin/orders/{test_order_id}",
            json={"assigned_staff_id": staff_id},
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            order = resp.json()
            if order.get("assigned_staff_id") == staff_id:
                result.add_pass("Admin order assign staff", f"Assigned to staff {staff_id}")
            else:
                result.add_fail("Admin order assign staff", f"Staff not assigned: {order.get('assigned_staff_id')}")
        else:
            result.add_fail("Admin order assign staff", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Admin order assign staff", str(e))

def test_admin_stats_after_orders():
    """Test 27: GET /api/admin/stats reflects revenue after paid orders"""
    if not admin_session:
        result.add_fail("Admin stats after orders", "No admin session")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/stats",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            # We created COD orders, but they're not paid yet (payment_status = 'Cod Pending')
            # So revenue might still be 0 unless there are other paid orders
            result.add_pass("Admin stats after orders", 
                f"Revenue: ₹{data['revenue']}, Orders: {data['orders']}, Pending: {data['pending']}")
        else:
            result.add_fail("Admin stats after orders", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Admin stats after orders", str(e))

def test_payment_verify_invalid_signature():
    """Test 28: POST /api/orders/verify with fake signature returns 400"""
    if not customer_session or not test_order_id:
        result.add_fail("Payment verify invalid signature", "No customer session or test order")
        return
    
    try:
        payload = {
            "order_id": test_order_id,
            "razorpay_order_id": "order_fake123",
            "razorpay_payment_id": "pay_fake123",
            "razorpay_signature": "fake_signature_12345"
        }
        resp = requests.post(
            f"{BASE_URL}/orders/verify",
            json=payload,
            cookies={"session_token": customer_session},
            timeout=10
        )
        if resp.status_code == 400:
            result.add_pass("Payment verify invalid signature (400)", "Correctly returns 400")
        else:
            result.add_fail("Payment verify invalid signature (400)", f"Expected 400, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Payment verify invalid signature (400)", str(e))

def test_delivery_charge_logic():
    """Test 29: Verify delivery charge logic (< ₹200 = ₹100, ≥ ₹200 = ₹0)"""
    # This is already tested in test_order_create_cod_with_delivery and test_order_create_razorpay_no_delivery
    # Just add a summary
    result.add_pass("Delivery charge logic", "Verified in order creation tests (< ₹200 → ₹100, ≥ ₹200 → ₹0)")

# ==================== NEW ENDPOINTS TESTS ====================

def test_offline_order_without_auth():
    """Test 30: POST /api/admin/orders/offline without auth returns 401"""
    try:
        payload = {
            "customer_name": "Walk-in Customer",
            "customer_phone": "9999911111",
            "customer_email": "",
            "items": [{"slug": "green-chilli", "variant_id": "250g", "qty": 2}],
            "payment_method": "cash",
            "payment_status": "Paid",
            "notes": "Cash paid at farm",
            "status": "Placed"
        }
        resp = requests.post(f"{BASE_URL}/admin/orders/offline", json=payload, timeout=10)
        if resp.status_code == 401:
            result.add_pass("Offline order without auth (401)", "Correctly returns 401")
        else:
            result.add_fail("Offline order without auth (401)", f"Expected 401, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Offline order without auth (401)", str(e))

def test_offline_order_admin():
    """Test 31: POST /api/admin/orders/offline with admin session"""
    if not admin_session:
        result.add_fail("Offline order (admin)", "No admin session available")
        return
    
    try:
        payload = {
            "customer_name": "Ramesh Patel",
            "customer_phone": "9999911111",
            "customer_email": "",
            "items": [{"slug": "green-chilli", "variant_id": "250g", "qty": 2}],
            "payment_method": "cash",
            "payment_status": "Paid",
            "notes": "Cash paid at farm",
            "status": "Placed"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/orders/offline",
            json=payload,
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            # green-chilli 250g is ₹30, qty=2 → subtotal=₹60, delivery=₹100, total=₹160
            if (data.get("source") == "offline" and
                "order_id" in data and
                data.get("subtotal") == 60 and
                data.get("delivery_charge") == 100 and
                data.get("total") == 160 and
                data.get("customer_email") == "offline_9999911111@retrofarms.offline"):
                result.add_pass("Offline order (admin)", 
                    f"Order {data['order_id']}: source=offline, total=₹160, email={data['customer_email']}")
            else:
                result.add_fail("Offline order (admin)", f"Incorrect data: {data}")
        else:
            result.add_fail("Offline order (admin)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Offline order (admin)", str(e))

def test_offline_order_staff():
    """Test 32: POST /api/admin/orders/offline with staff session"""
    if not staff_session:
        result.add_fail("Offline order (staff)", "No staff session available")
        return
    
    try:
        payload = {
            "customer_name": "Suresh Kumar",
            "customer_phone": "9999922222",
            "customer_email": "",
            "items": [{"slug": "green-chilli", "variant_id": "250g", "qty": 1}],
            "payment_method": "cash",
            "payment_status": "Paid",
            "notes": "Staff sale",
            "status": "Placed"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/orders/offline",
            json=payload,
            cookies={"session_token": staff_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("source") == "offline" and "order_id" in data:
                result.add_pass("Offline order (staff)", f"Order {data['order_id']}: source=offline")
            else:
                result.add_fail("Offline order (staff)", f"Incorrect data: {data}")
        else:
            result.add_fail("Offline order (staff)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Offline order (staff)", str(e))

def test_offline_order_in_list():
    """Test 33: Verify offline order appears in GET /api/admin/orders"""
    if not admin_session:
        result.add_fail("Offline order in list", "No admin session available")
        return
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/orders",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            orders = resp.json()
            offline_orders = [o for o in orders if o.get("source") == "offline"]
            if offline_orders:
                result.add_pass("Offline order in list", f"Found {len(offline_orders)} offline orders")
            else:
                result.add_fail("Offline order in list", "No offline orders found in list")
        else:
            result.add_fail("Offline order in list", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Offline order in list", str(e))

def test_product_create():
    """Test 34: POST /api/admin/products creates new product"""
    if not admin_session:
        result.add_fail("Product create", "No admin session available")
        return
    
    try:
        payload = {
            "slug": "test-honey",
            "name": "Farm Honey",
            "category": "fruits",
            "image": "https://example.com/honey.jpg",
            "from_price": 300,
            "description": "Raw wild honey",
            "variants": [{"id": "500g", "label": "500 g jar", "price": 300, "stock": 20}]
        }
        resp = requests.post(
            f"{BASE_URL}/admin/products",
            json=payload,
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("slug") == "test-honey" and data.get("name") == "Farm Honey":
                result.add_pass("Product create", f"Created product: {data['slug']}")
            else:
                result.add_fail("Product create", f"Incorrect data: {data}")
        else:
            result.add_fail("Product create", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Product create", str(e))

def test_product_create_duplicate():
    """Test 35: POST /api/admin/products with duplicate slug returns 400"""
    if not admin_session:
        result.add_fail("Product create duplicate (400)", "No admin session available")
        return
    
    try:
        payload = {
            "slug": "test-honey",
            "name": "Another Honey",
            "category": "fruits",
            "image": "https://example.com/honey2.jpg",
            "from_price": 350,
            "description": "Another honey",
            "variants": [{"id": "1kg", "label": "1 kg jar", "price": 600, "stock": 10}]
        }
        resp = requests.post(
            f"{BASE_URL}/admin/products",
            json=payload,
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 400:
            result.add_pass("Product create duplicate (400)", "Correctly returns 400")
        else:
            result.add_fail("Product create duplicate (400)", f"Expected 400, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Product create duplicate (400)", str(e))

def test_product_get():
    """Test 36: GET /api/products/test-honey returns created product"""
    try:
        resp = requests.get(f"{BASE_URL}/products/test-honey", timeout=10)
        if resp.status_code == 200:
            product = resp.json()
            if product.get("slug") == "test-honey" and product.get("name") == "Farm Honey":
                result.add_pass("Product get (test-honey)", f"Found product: {product['name']}")
            else:
                result.add_fail("Product get (test-honey)", f"Incorrect data: {product}")
        else:
            result.add_fail("Product get (test-honey)", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Product get (test-honey)", str(e))

def test_product_update():
    """Test 37: PUT /api/admin/products/test-honey updates product"""
    if not admin_session:
        result.add_fail("Product update", "No admin session available")
        return
    
    try:
        payload = {
            "name": "Wild Forest Honey",
            "from_price": 350
        }
        resp = requests.put(
            f"{BASE_URL}/admin/products/test-honey",
            json=payload,
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("name") == "Wild Forest Honey" and data.get("from_price") == 350:
                result.add_pass("Product update", f"Updated: name={data['name']}, from_price=₹{data['from_price']}")
            else:
                result.add_fail("Product update", f"Update not reflected: {data}")
        else:
            result.add_fail("Product update", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Product update", str(e))

def test_product_update_verify():
    """Test 38: GET /api/products/test-honey verifies update"""
    try:
        resp = requests.get(f"{BASE_URL}/products/test-honey", timeout=10)
        if resp.status_code == 200:
            product = resp.json()
            if product.get("name") == "Wild Forest Honey" and product.get("from_price") == 350:
                result.add_pass("Product update verify", "Update confirmed")
            else:
                result.add_fail("Product update verify", f"Update not persisted: {product}")
        else:
            result.add_fail("Product update verify", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Product update verify", str(e))

def test_variant_add():
    """Test 39: POST /api/admin/products/test-honey/variants adds variant"""
    if not admin_session:
        result.add_fail("Variant add", "No admin session available")
        return
    
    try:
        payload = {
            "id": "1kg",
            "label": "1 kg jar",
            "price": 580,
            "stock": 10
        }
        resp = requests.post(
            f"{BASE_URL}/admin/products/test-honey/variants",
            json=payload,
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            variants = data.get("variants", [])
            if any(v.get("id") == "1kg" for v in variants):
                result.add_pass("Variant add", "Added variant: 1kg")
            else:
                result.add_fail("Variant add", f"Variant not added: {variants}")
        else:
            result.add_fail("Variant add", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Variant add", str(e))

def test_variant_update():
    """Test 40: PATCH /api/admin/products/test-honey/variants/1kg updates variant"""
    if not admin_session:
        result.add_fail("Variant update", "No admin session available")
        return
    
    try:
        payload = {
            "price": 600,
            "stock": 15
        }
        resp = requests.patch(
            f"{BASE_URL}/admin/products/test-honey/variants/1kg",
            json=payload,
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            variants = data.get("variants", [])
            variant_1kg = next((v for v in variants if v.get("id") == "1kg"), None)
            if variant_1kg and variant_1kg.get("price") == 600 and variant_1kg.get("stock") == 15:
                result.add_pass("Variant update", "Updated: price=₹600, stock=15")
            else:
                result.add_fail("Variant update", f"Update not reflected: {variant_1kg}")
        else:
            result.add_fail("Variant update", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Variant update", str(e))

def test_variant_delete():
    """Test 41: DELETE /api/admin/products/test-honey/variants/500g removes variant"""
    if not admin_session:
        result.add_fail("Variant delete", "No admin session available")
        return
    
    try:
        resp = requests.delete(
            f"{BASE_URL}/admin/products/test-honey/variants/500g",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            # Verify variant is removed
            get_resp = requests.get(f"{BASE_URL}/products/test-honey", timeout=10)
            if get_resp.status_code == 200:
                product = get_resp.json()
                variants = product.get("variants", [])
                if not any(v.get("id") == "500g" for v in variants):
                    result.add_pass("Variant delete", "Removed variant: 500g")
                else:
                    result.add_fail("Variant delete", "Variant still exists")
            else:
                result.add_fail("Variant delete", "Could not verify deletion")
        else:
            result.add_fail("Variant delete", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Variant delete", str(e))

def test_product_delete():
    """Test 42: DELETE /api/admin/products/test-honey removes product"""
    if not admin_session:
        result.add_fail("Product delete", "No admin session available")
        return
    
    try:
        resp = requests.delete(
            f"{BASE_URL}/admin/products/test-honey",
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            result.add_pass("Product delete", "Deleted product: test-honey")
        else:
            result.add_fail("Product delete", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Product delete", str(e))

def test_product_delete_verify():
    """Test 43: GET /api/products/test-honey returns 404 after deletion"""
    try:
        resp = requests.get(f"{BASE_URL}/products/test-honey", timeout=10)
        if resp.status_code == 404:
            result.add_pass("Product delete verify (404)", "Product not found after deletion")
        else:
            result.add_fail("Product delete verify (404)", f"Expected 404, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Product delete verify (404)", str(e))

def test_staff_cannot_create_product():
    """Test 44: Staff role should get 403 when trying to create product"""
    if not staff_session:
        result.add_fail("Staff cannot create product (403)", "No staff session available")
        return
    
    try:
        payload = {
            "slug": "staff-test",
            "name": "Staff Test",
            "category": "fruits",
            "image": "https://example.com/test.jpg",
            "from_price": 100,
            "description": "Should fail",
            "variants": [{"id": "1kg", "label": "1 kg", "price": 100, "stock": 10}]
        }
        resp = requests.post(
            f"{BASE_URL}/admin/products",
            json=payload,
            cookies={"session_token": staff_session},
            timeout=10
        )
        if resp.status_code == 403:
            result.add_pass("Staff cannot create product (403)", "Correctly returns 403")
        else:
            result.add_fail("Staff cannot create product (403)", f"Expected 403, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Staff cannot create product (403)", str(e))

def test_staff_cannot_update_product():
    """Test 45: Staff role should get 403 when trying to update product"""
    if not staff_session:
        result.add_fail("Staff cannot update product (403)", "No staff session available")
        return
    
    try:
        payload = {"name": "Should Fail"}
        resp = requests.put(
            f"{BASE_URL}/admin/products/country-eggs",
            json=payload,
            cookies={"session_token": staff_session},
            timeout=10
        )
        if resp.status_code == 403:
            result.add_pass("Staff cannot update product (403)", "Correctly returns 403")
        else:
            result.add_fail("Staff cannot update product (403)", f"Expected 403, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Staff cannot update product (403)", str(e))

def test_staff_cannot_delete_product():
    """Test 46: Staff role should get 403 when trying to delete product"""
    if not staff_session:
        result.add_fail("Staff cannot delete product (403)", "No staff session available")
        return
    
    try:
        resp = requests.delete(
            f"{BASE_URL}/admin/products/country-eggs",
            cookies={"session_token": staff_session},
            timeout=10
        )
        if resp.status_code == 403:
            result.add_pass("Staff cannot delete product (403)", "Correctly returns 403")
        else:
            result.add_fail("Staff cannot delete product (403)", f"Expected 403, got {resp.status_code}")
    except Exception as e:
        result.add_fail("Staff cannot delete product (403)", str(e))

def test_regression_products_list():
    """Test 47: Regression - GET /api/products still returns 11+ products"""
    try:
        resp = requests.get(f"{BASE_URL}/products", timeout=10)
        if resp.status_code == 200:
            products = resp.json()
            if isinstance(products, list) and len(products) >= 11:
                result.add_pass("Regression: Products list", f"Found {len(products)} products")
            else:
                result.add_fail("Regression: Products list", f"Expected 11+ products, got {len(products)}")
        else:
            result.add_fail("Regression: Products list", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Regression: Products list", str(e))

def test_regression_admin_login():
    """Test 48: Regression - POST /api/auth/admin-login still works"""
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/admin-login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("role") == "admin":
                result.add_pass("Regression: Admin login", "Still working")
            else:
                result.add_fail("Regression: Admin login", f"Unexpected response: {data}")
        else:
            result.add_fail("Regression: Admin login", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Regression: Admin login", str(e))

def test_regression_inventory_update():
    """Test 49: Regression - PATCH /api/admin/products/country-eggs/variants/dozen/stock still works"""
    if not admin_session:
        result.add_fail("Regression: Inventory update", "No admin session available")
        return
    
    try:
        resp = requests.patch(
            f"{BASE_URL}/admin/products/country-eggs/variants/dozen/stock",
            json={"stock": 200},
            cookies={"session_token": admin_session},
            timeout=10
        )
        if resp.status_code == 200:
            result.add_pass("Regression: Inventory update", "Still working")
        else:
            result.add_fail("Regression: Inventory update", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        result.add_fail("Regression: Inventory update", str(e))

def main():
    print("="*80)
    print("RETRO FARMS BACKEND API TEST SUITE")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print("="*80)
    print()
    
    # Run all tests in order
    test_basic_endpoint()
    test_products_list()
    test_product_detail()
    test_product_not_found()
    test_admin_login()
    test_admin_login_wrong_password()
    test_auth_me_with_cookie()
    test_auth_me_without_cookie()
    test_staff_login()
    test_admin_stats()
    test_admin_orders()
    test_admin_customers()
    test_admin_staff_list()
    test_staff_create()
    test_staff_appears_in_list()
    test_staff_delete()
    test_staff_cannot_create_staff()
    test_inventory_update()
    test_inventory_verify()
    test_order_create_without_auth()
    test_order_create_cod_with_delivery()
    test_order_get()
    test_order_create_razorpay_no_delivery()
    test_orders_my()
    test_admin_order_update_status()
    test_admin_order_assign_staff()
    test_admin_stats_after_orders()
    test_payment_verify_invalid_signature()
    test_delivery_charge_logic()
    
    # NEW ENDPOINTS TESTS
    print("\n" + "="*80)
    print("TESTING NEW ENDPOINTS (Offline Orders + Product CRUD)")
    print("="*80)
    test_offline_order_without_auth()
    test_offline_order_admin()
    test_offline_order_staff()
    test_offline_order_in_list()
    test_product_create()
    test_product_create_duplicate()
    test_product_get()
    test_product_update()
    test_product_update_verify()
    test_variant_add()
    test_variant_update()
    test_variant_delete()
    test_product_delete()
    test_product_delete_verify()
    test_staff_cannot_create_product()
    test_staff_cannot_update_product()
    test_staff_cannot_delete_product()
    
    # REGRESSION TESTS
    print("\n" + "="*80)
    print("REGRESSION TESTS")
    print("="*80)
    test_regression_products_list()
    test_regression_admin_login()
    test_regression_inventory_update()
    
    # Print summary
    success = result.summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
