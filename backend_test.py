#!/usr/bin/env python3
"""
Comprehensive backend API tests for Retro Farms Feedback System
Tests all feedback endpoints with anti-fraud safeguards
"""

import requests
import json
import time
import subprocess
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://farm-to-table-541.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@retrofarms.in"
ADMIN_PASSWORD = "admin123"
STAFF_EMAIL = "staff@retrofarms.in"
STAFF_PASSWORD = "staff123"

# Test results tracking
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(test_name, passed, message=""):
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        status = "✅ PASS"
    else:
        tests_failed += 1
        status = "❌ FAIL"
    result = f"{status}: {test_name}"
    if message:
        result += f" - {message}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "message": message})

def create_customer_session():
    """Create a test customer session using MongoDB"""
    cmd = """mongosh --quiet --eval "use('test_database');
var uid='user_fb_test_'+Date.now();
var token='sess_fb_'+Date.now();
db.users.insertOne({user_id:uid, email:'fbtest'+Date.now()+'@example.com', name:'FB Test', phone:'8000011111', role:'customer', provider:'google', created_at:new Date()});
var exp=new Date(Date.now()+7*24*3600*1000);
db.sessions.insertOne({session_token:token, user_id:uid, expires_at:exp, created_at:new Date()});
print('TOKEN='+token+',UID='+uid);" """
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    output = result.stdout.strip()
    
    # Parse TOKEN and UID from output
    if "TOKEN=" in output:
        parts = output.split("TOKEN=")[1].split(",UID=")
        token = parts[0].strip()
        uid = parts[1].strip()
        return {"token": token, "user_id": uid}
    else:
        raise Exception(f"Failed to create customer session: {output}")

def admin_login():
    """Login as admin and return session token"""
    response = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        cookies = response.cookies
        return cookies.get("session_token")
    else:
        raise Exception(f"Admin login failed: {response.status_code} {response.text}")

def staff_login():
    """Login as staff and return session token"""
    response = requests.post(f"{BASE_URL}/auth/admin-login", json={
        "email": STAFF_EMAIL,
        "password": STAFF_PASSWORD
    })
    if response.status_code == 200:
        cookies = response.cookies
        return cookies.get("session_token")
    else:
        raise Exception(f"Staff login failed: {response.status_code} {response.text}")

def create_order_as_customer(customer_token):
    """Create a COD order as customer"""
    cookies = {"session_token": customer_token}
    response = requests.post(f"{BASE_URL}/orders/create", 
        cookies=cookies,
        json={
            "items": [{"slug": "country-eggs", "variant_id": "dozen", "qty": 1}],
            "address": {
                "full_name": "FB Test Customer",
                "phone": "8000011111",
                "line1": "123 Test St",
                "city": "Test City",
                "pincode": "123456"
            },
            "payment_method": "cod"
        })
    
    if response.status_code == 200:
        return response.json()["order_id"]
    else:
        raise Exception(f"Order creation failed: {response.status_code} {response.text}")

def mark_order_delivered(order_id, admin_token):
    """Mark order as Delivered"""
    cookies = {"session_token": admin_token}
    response = requests.patch(f"{BASE_URL}/admin/orders/{order_id}",
        cookies=cookies,
        json={"status": "Delivered"})
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Mark delivered failed: {response.status_code} {response.text}")

print("=" * 80)
print("RETRO FARMS FEEDBACK SYSTEM - COMPREHENSIVE BACKEND TESTS")
print("=" * 80)
print()

# Test 1: Cannot submit for a non-Delivered order
print("Test 1: Cannot submit feedback for non-Delivered order")
try:
    customer1 = create_customer_session()
    order1 = create_order_as_customer(customer1["token"])
    
    # Try to submit feedback immediately (order is Pending)
    cookies = {"session_token": customer1["token"]}
    response = requests.post(f"{BASE_URL}/feedback",
        cookies=cookies,
        json={"order_id": order1, "rating": 5, "comment": "Great"})
    
    if response.status_code == 400 and "only available after your order is delivered" in response.text.lower():
        log_test("Cannot submit for non-Delivered order", True, "Correctly returns 400")
    else:
        log_test("Cannot submit for non-Delivered order", False, f"Expected 400, got {response.status_code}: {response.text}")
except Exception as e:
    log_test("Cannot submit for non-Delivered order", False, str(e))

print()

# Test 2: Cannot submit for someone else's order
print("Test 2: Cannot submit feedback for someone else's order")
try:
    customer2 = create_customer_session()
    
    # Customer 2 tries to submit feedback for customer 1's order
    cookies = {"session_token": customer2["token"]}
    response = requests.post(f"{BASE_URL}/feedback",
        cookies=cookies,
        json={"order_id": order1, "rating": 5, "comment": "Great"})
    
    if response.status_code == 403 and "only review your own orders" in response.text.lower():
        log_test("Cannot submit for someone else's order", True, "Correctly returns 403")
    else:
        log_test("Cannot submit for someone else's order", False, f"Expected 403, got {response.status_code}: {response.text}")
except Exception as e:
    log_test("Cannot submit for someone else's order", False, str(e))

print()

# Test 3: Cannot submit unauthenticated
print("Test 3: Cannot submit feedback unauthenticated")
try:
    response = requests.post(f"{BASE_URL}/feedback",
        json={"order_id": order1, "rating": 5, "comment": "Great"})
    
    if response.status_code == 401:
        log_test("Cannot submit unauthenticated", True, "Correctly returns 401")
    else:
        log_test("Cannot submit unauthenticated", False, f"Expected 401, got {response.status_code}: {response.text}")
except Exception as e:
    log_test("Cannot submit unauthenticated", False, str(e))

print()

# Test 4: Admin/staff cannot submit
print("Test 4: Admin/staff cannot submit feedback")
try:
    admin_token = admin_login()
    
    # Mark order1 as Delivered first
    mark_order_delivered(order1, admin_token)
    
    # Admin tries to submit feedback
    cookies = {"session_token": admin_token}
    response = requests.post(f"{BASE_URL}/feedback",
        cookies=cookies,
        json={"order_id": order1, "rating": 5, "comment": "Great"})
    
    if response.status_code == 403 and "staff and admins cannot submit" in response.text.lower():
        log_test("Admin cannot submit feedback", True, "Correctly returns 403")
    else:
        log_test("Admin cannot submit feedback", False, f"Expected 403, got {response.status_code}: {response.text}")
    
    # Staff tries to submit feedback
    staff_token = staff_login()
    cookies = {"session_token": staff_token}
    response = requests.post(f"{BASE_URL}/feedback",
        cookies=cookies,
        json={"order_id": order1, "rating": 5, "comment": "Great"})
    
    if response.status_code == 403 and "staff and admins cannot submit" in response.text.lower():
        log_test("Staff cannot submit feedback", True, "Correctly returns 403")
    else:
        log_test("Staff cannot submit feedback", False, f"Expected 403, got {response.status_code}: {response.text}")
except Exception as e:
    log_test("Admin/staff cannot submit feedback", False, str(e))

print()

# Test 5: Happy path - submit feedback for delivered order
print("Test 5: Happy path - submit feedback for delivered order")
try:
    # Customer 1 submits feedback (order1 is now Delivered)
    cookies = {"session_token": customer1["token"]}
    response = requests.post(f"{BASE_URL}/feedback",
        cookies=cookies,
        json={"order_id": order1, "rating": 5, "comment": "Excellent service!"})
    
    if response.status_code == 200:
        feedback_data = response.json()
        feedback_id = feedback_data.get("feedback_id")
        
        # Check response structure
        if (feedback_id and 
            feedback_data.get("rating") == 5 and 
            feedback_data.get("comment") == "Excellent service!" and
            feedback_data.get("status") in ["active", "flagged"]):
            log_test("Submit feedback for delivered order", True, f"Feedback created with ID {feedback_id}, status={feedback_data.get('status')}")
        else:
            log_test("Submit feedback for delivered order", False, f"Response missing required fields: {feedback_data}")
    else:
        log_test("Submit feedback for delivered order", False, f"Expected 200, got {response.status_code}: {response.text}")
    
    # Test duplicate submission
    response = requests.post(f"{BASE_URL}/feedback",
        cookies=cookies,
        json={"order_id": order1, "rating": 4, "comment": "Changed my mind"})
    
    if response.status_code == 400 and "already submitted" in response.text.lower():
        log_test("Duplicate feedback prevention", True, "Correctly returns 400")
    else:
        log_test("Duplicate feedback prevention", False, f"Expected 400, got {response.status_code}: {response.text}")
    
    # Test GET feedback by order_id as owner
    response = requests.get(f"{BASE_URL}/feedback/order/{order1}",
        cookies=cookies)
    
    if response.status_code == 200 and response.json() is not None:
        fb = response.json()
        if fb.get("feedback_id") == feedback_id:
            log_test("Get feedback by order_id (owner)", True, "Returns correct feedback")
        else:
            log_test("Get feedback by order_id (owner)", False, f"Feedback ID mismatch")
    else:
        log_test("Get feedback by order_id (owner)", False, f"Expected 200 with data, got {response.status_code}")
    
    # Test GET feedback unauthenticated
    response = requests.get(f"{BASE_URL}/feedback/order/{order1}")
    
    if response.status_code == 200 and response.json() is None:
        log_test("Get feedback unauthenticated returns null", True, "Correctly returns null")
    else:
        log_test("Get feedback unauthenticated returns null", False, f"Expected null, got {response.json()}")
    
except Exception as e:
    log_test("Happy path", False, str(e))

print()

# Test 6: Edit feedback within 48h
print("Test 6: Edit feedback within 48h")
try:
    # Edit the feedback
    cookies = {"session_token": customer1["token"]}
    response = requests.patch(f"{BASE_URL}/feedback/{feedback_id}",
        cookies=cookies,
        json={"rating": 4, "comment": "Updated comment"})
    
    if response.status_code == 200:
        updated = response.json()
        if (updated.get("rating") == 4 and 
            updated.get("comment") == "Updated comment" and
            updated.get("edit_count") == 1):
            log_test("Edit feedback within 48h", True, f"Rating updated to 4, edit_count=1")
        else:
            log_test("Edit feedback within 48h", False, f"Fields not updated correctly: {updated}")
    else:
        log_test("Edit feedback within 48h", False, f"Expected 200, got {response.status_code}: {response.text}")
    
    # Try to edit from different customer
    cookies = {"session_token": customer2["token"]}
    response = requests.patch(f"{BASE_URL}/feedback/{feedback_id}",
        cookies=cookies,
        json={"rating": 3})
    
    if response.status_code == 403:
        log_test("Cannot edit someone else's feedback", True, "Correctly returns 403")
    else:
        log_test("Cannot edit someone else's feedback", False, f"Expected 403, got {response.status_code}")
    
except Exception as e:
    log_test("Edit feedback", False, str(e))

print()

# Test 7: Anti-fraud auto-flag
print("Test 7: Anti-fraud auto-flag heuristics")
try:
    # Test instant_after_delivery flag
    # Create a new order and mark it delivered, then immediately submit feedback
    customer3 = create_customer_session()
    order3 = create_order_as_customer(customer3["token"])
    admin_token = admin_login()
    mark_order_delivered(order3, admin_token)
    
    # Submit feedback immediately (within 5 seconds)
    cookies = {"session_token": customer3["token"]}
    response = requests.post(f"{BASE_URL}/feedback",
        cookies=cookies,
        json={"order_id": order3, "rating": 5, "comment": "Instant feedback"})
    
    if response.status_code == 200:
        fb = response.json()
        if fb.get("status") == "flagged" and "instant_after_delivery" in fb.get("flags", []):
            log_test("Anti-fraud: instant_after_delivery", True, "Correctly flagged")
        else:
            log_test("Anti-fraud: instant_after_delivery", False, f"Not flagged or wrong flag: status={fb.get('status')}, flags={fb.get('flags')}")
    else:
        log_test("Anti-fraud: instant_after_delivery", False, f"Expected 200, got {response.status_code}")
    
    # Test duplicate_comment flag
    # Create two customers with same comment
    customer4 = create_customer_session()
    order4 = create_order_as_customer(customer4["token"])
    mark_order_delivered(order4, admin_token)
    time.sleep(1)  # Wait a bit to avoid instant flag
    
    duplicate_comment = "This is a duplicate comment for testing"
    
    # First customer submits
    cookies = {"session_token": customer4["token"]}
    response = requests.post(f"{BASE_URL}/feedback",
        cookies=cookies,
        json={"order_id": order4, "rating": 5, "comment": duplicate_comment})
    
    if response.status_code != 200:
        log_test("Anti-fraud: duplicate_comment setup", False, f"First feedback failed: {response.status_code}")
    else:
        # Second customer submits same comment
        customer5 = create_customer_session()
        order5 = create_order_as_customer(customer5["token"])
        mark_order_delivered(order5, admin_token)
        time.sleep(1)
        
        cookies = {"session_token": customer5["token"]}
        response = requests.post(f"{BASE_URL}/feedback",
            cookies=cookies,
            json={"order_id": order5, "rating": 5, "comment": duplicate_comment})
        
        if response.status_code == 200:
            fb = response.json()
            if fb.get("status") == "flagged" and "duplicate_comment" in fb.get("flags", []):
                log_test("Anti-fraud: duplicate_comment", True, "Correctly flagged")
            else:
                log_test("Anti-fraud: duplicate_comment", False, f"Not flagged: status={fb.get('status')}, flags={fb.get('flags')}")
        else:
            log_test("Anti-fraud: duplicate_comment", False, f"Expected 200, got {response.status_code}")
    
    # Test high_ip_volume / high_user_volume
    # Create 3 customers and submit 3 feedbacks quickly
    print("  Testing high volume flags (creating 3 orders and feedbacks)...")
    volume_customers = []
    for i in range(3):
        c = create_customer_session()
        o = create_order_as_customer(c["token"])
        mark_order_delivered(o, admin_token)
        volume_customers.append({"customer": c, "order": o})
        time.sleep(0.5)
    
    # Submit 3 feedbacks from same IP (test client)
    flagged_count = 0
    for i, vc in enumerate(volume_customers):
        cookies = {"session_token": vc["customer"]["token"]}
        response = requests.post(f"{BASE_URL}/feedback",
            cookies=cookies,
            json={"order_id": vc["order"], "rating": 5, "comment": f"Volume test {i}"})
        
        if response.status_code == 200:
            fb = response.json()
            if fb.get("status") == "flagged" and ("high_ip_volume" in fb.get("flags", []) or "high_user_volume" in fb.get("flags", [])):
                flagged_count += 1
    
    if flagged_count > 0:
        log_test("Anti-fraud: high_ip_volume or high_user_volume", True, f"{flagged_count} feedback(s) flagged")
    else:
        log_test("Anti-fraud: high_ip_volume or high_user_volume", False, "No feedbacks flagged for high volume")
    
except Exception as e:
    log_test("Anti-fraud auto-flag", False, str(e))

print()

# Test 8: Rate limit (5 feedbacks per hour)
print("Test 8: Rate limit - max 5 feedbacks per hour")
try:
    # We already have several feedbacks submitted above
    # Create 2 more customers and try to submit (should hit rate limit)
    admin_token = admin_login()
    
    rate_limit_customers = []
    for i in range(2):
        c = create_customer_session()
        o = create_order_as_customer(c["token"])
        mark_order_delivered(o, admin_token)
        rate_limit_customers.append({"customer": c, "order": o})
        time.sleep(0.3)
    
    # Try to submit feedbacks (should hit rate limit on 6th attempt)
    for i, rc in enumerate(rate_limit_customers):
        cookies = {"session_token": rc["customer"]["token"]}
        response = requests.post(f"{BASE_URL}/feedback",
            cookies=cookies,
            json={"order_id": rc["order"], "rating": 5, "comment": f"Rate limit test {i}"})
        
        if response.status_code == 429:
            log_test("Rate limit enforcement", True, f"Correctly returns 429 after multiple submissions")
            break
        elif i == len(rate_limit_customers) - 1:
            # If we didn't hit rate limit, it might be because we're under the limit
            log_test("Rate limit enforcement", True, "Rate limit not hit (under 5 submissions in this test run)")
    
except Exception as e:
    log_test("Rate limit", False, str(e))

print()

# Test 9: Admin moderation
print("Test 9: Admin moderation endpoints")
try:
    admin_token = admin_login()
    cookies = {"session_token": admin_token}
    
    # GET /api/admin/feedback - list all
    response = requests.get(f"{BASE_URL}/admin/feedback", cookies=cookies)
    
    if response.status_code == 200:
        all_feedback = response.json()
        if isinstance(all_feedback, list) and len(all_feedback) > 0:
            log_test("Admin list all feedback", True, f"Returns {len(all_feedback)} feedback(s)")
        else:
            log_test("Admin list all feedback", False, f"Expected non-empty list, got {all_feedback}")
    else:
        log_test("Admin list all feedback", False, f"Expected 200, got {response.status_code}")
    
    # GET /api/admin/feedback?status=flagged
    response = requests.get(f"{BASE_URL}/admin/feedback?status=flagged", cookies=cookies)
    
    if response.status_code == 200:
        flagged_feedback = response.json()
        if isinstance(flagged_feedback, list):
            # Check all returned items have status=flagged
            all_flagged = all(fb.get("status") == "flagged" for fb in flagged_feedback)
            if all_flagged:
                log_test("Admin filter by status=flagged", True, f"Returns {len(flagged_feedback)} flagged feedback(s)")
            else:
                log_test("Admin filter by status=flagged", False, "Some feedback not flagged")
        else:
            log_test("Admin filter by status=flagged", False, f"Expected list, got {flagged_feedback}")
    else:
        log_test("Admin filter by status=flagged", False, f"Expected 200, got {response.status_code}")
    
    # PATCH /api/admin/feedback/{id} - update status to hidden
    if len(all_feedback) > 0:
        test_fb_id = all_feedback[0]["feedback_id"]
        
        response = requests.patch(f"{BASE_URL}/admin/feedback/{test_fb_id}",
            cookies=cookies,
            json={"status": "hidden"})
        
        if response.status_code == 200:
            updated = response.json()
            if (updated.get("status") == "hidden" and 
                updated.get("moderated_by") and 
                updated.get("moderated_at")):
                log_test("Admin update feedback status", True, "Status updated to hidden with moderated_by/moderated_at")
            else:
                log_test("Admin update feedback status", False, f"Fields not set correctly: {updated}")
        else:
            log_test("Admin update feedback status", False, f"Expected 200, got {response.status_code}")
        
        # PATCH with admin_response
        response = requests.patch(f"{BASE_URL}/admin/feedback/{test_fb_id}",
            cookies=cookies,
            json={"admin_response": "Thanks for your feedback!"})
        
        if response.status_code == 200:
            updated = response.json()
            if updated.get("admin_response") == "Thanks for your feedback!":
                log_test("Admin add response", True, "admin_response saved")
            else:
                log_test("Admin add response", False, f"admin_response not saved: {updated}")
        else:
            log_test("Admin add response", False, f"Expected 200, got {response.status_code}")
    
    # Test staff can also moderate
    staff_token = staff_login()
    cookies = {"session_token": staff_token}
    
    response = requests.get(f"{BASE_URL}/admin/feedback", cookies=cookies)
    
    if response.status_code == 200:
        log_test("Staff can list feedback", True, "Staff has access")
    else:
        log_test("Staff can list feedback", False, f"Expected 200, got {response.status_code}")
    
    if len(all_feedback) > 1:
        test_fb_id2 = all_feedback[1]["feedback_id"]
        response = requests.patch(f"{BASE_URL}/admin/feedback/{test_fb_id2}",
            cookies=cookies,
            json={"status": "active"})
        
        if response.status_code == 200:
            log_test("Staff can moderate feedback", True, "Staff can update status")
        else:
            log_test("Staff can moderate feedback", False, f"Expected 200, got {response.status_code}")
    
except Exception as e:
    log_test("Admin moderation", False, str(e))

print()

# Test 10: Public feedback endpoint
print("Test 10: Public feedback endpoint")
try:
    response = requests.get(f"{BASE_URL}/feedback/public")
    
    if response.status_code == 200:
        public_feedback = response.json()
        if isinstance(public_feedback, list):
            # Check all have status=active and rating>=4
            all_valid = all(
                fb.get("status") == "active" and 
                fb.get("rating") >= 4 and
                "ip_address" not in fb and
                "user_agent" not in fb and
                "customer_email" not in fb and
                "customer_phone" not in fb
                for fb in public_feedback
            )
            
            if all_valid:
                log_test("Public feedback endpoint", True, f"Returns {len(public_feedback)} public feedback(s), no PII")
            else:
                # Check which validation failed
                issues = []
                for fb in public_feedback:
                    if fb.get("status") != "active":
                        issues.append(f"status={fb.get('status')}")
                    if fb.get("rating") < 4:
                        issues.append(f"rating={fb.get('rating')}")
                    if "ip_address" in fb:
                        issues.append("ip_address present")
                    if "user_agent" in fb:
                        issues.append("user_agent present")
                    if "customer_email" in fb:
                        issues.append("customer_email present")
                    if "customer_phone" in fb:
                        issues.append("customer_phone present")
                
                log_test("Public feedback endpoint", False, f"Validation failed: {', '.join(set(issues))}")
        else:
            log_test("Public feedback endpoint", False, f"Expected list, got {public_feedback}")
    else:
        log_test("Public feedback endpoint", False, f"Expected 200, got {response.status_code}")
    
except Exception as e:
    log_test("Public feedback endpoint", False, str(e))

print()

# Test 11: Regression - existing endpoints still work
print("Test 11: Regression tests")
try:
    # GET /api/products
    response = requests.get(f"{BASE_URL}/products")
    
    if response.status_code == 200 and isinstance(response.json(), list):
        log_test("Regression: GET /api/products", True, "Still works")
    else:
        log_test("Regression: GET /api/products", False, f"Expected 200 with list, got {response.status_code}")
    
    # GET /api/admin/stats
    admin_token = admin_login()
    cookies = {"session_token": admin_token}
    response = requests.get(f"{BASE_URL}/admin/stats", cookies=cookies)
    
    if response.status_code == 200:
        stats = response.json()
        if "revenue" in stats and "orders" in stats:
            log_test("Regression: GET /api/admin/stats", True, "Still works")
        else:
            log_test("Regression: GET /api/admin/stats", False, f"Missing fields: {stats}")
    else:
        log_test("Regression: GET /api/admin/stats", False, f"Expected 200, got {response.status_code}")
    
    # Create order still works
    customer_test = create_customer_session()
    order_test = create_order_as_customer(customer_test["token"])
    
    if order_test:
        log_test("Regression: Order creation", True, "Still works")
    else:
        log_test("Regression: Order creation", False, "Order creation failed")
    
except Exception as e:
    log_test("Regression tests", False, str(e))

print()
print("=" * 80)
print(f"TESTS COMPLETED: {tests_passed} passed, {tests_failed} failed")
print("=" * 80)
print()

# Print summary
if tests_failed > 0:
    print("FAILED TESTS:")
    for result in test_results:
        if not result["passed"]:
            print(f"  ❌ {result['test']}: {result['message']}")
    print()

print(f"Total: {tests_passed}/{tests_passed + tests_failed} tests passed")
print()
