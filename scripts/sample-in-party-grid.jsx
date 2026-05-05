          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isSmallScreen ? '1fr' : '2fr 1fr', 
            gap: isSmallScreen ? '10px' : '12px' 
          }}>
             {/* Party name (customer / vendor / employee) — same behavior as Sample Out */}
             <div ref={customerDropdownRef} style={{ position: 'relative' }}>
               <label style={{ 
                 display: 'block', 
                fontSize: '12px', 
                 fontWeight: 600, 
                 color: '#475569', 
                 marginBottom: '4px' 
               }}>
                 {partyNameFieldLabel}<span style={{ color: '#ef4444' }}>*</span>
               </label>
               <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                 <div style={{ flex: 1, position: 'relative' }}>
                   <input
                     type="text"
                     value={partySearchValue}
                     onChange={(e) => {
                       const v = e.target.value;
                       if (partyType === 'customer') {
                         setCustomerSearch(v);
                         setSelectedCustomerId('');
                         setShowCustomerDropdown(true);
                       } else if (partyType === 'vendor') {
                         setVendorSearch(v);
                         setSelectedVendorId('');
                         setShowVendorDropdown(true);
                       } else {
                         setEmployeeSearch(v);
                         setSelectedEmployeeId('');
                         setShowEmployeeDropdown(true);
                       }
                     }}
                     onFocus={(e) => {
                       e.target.style.borderColor = '#3b82f6';
                       e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                       if (partyType === 'customer' && customerSearch.trim()) {
                         setShowCustomerDropdown(true);
                       }
                       if (partyType === 'vendor' && vendorSearch.trim()) {
                         setShowVendorDropdown(true);
                       }
                       if (partyType === 'employee' && employeeSearch.trim()) {
                         setShowEmployeeDropdown(true);
                       }
                     }}
                     onBlur={(e) => {
                       e.target.style.borderColor = '#d1d5db';
                       e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                     }}
                     placeholder={partySearchPlaceholder}
                     disabled={loadingPartyList}
                     style={{
                       width: '100%',
                      padding: '10px 12px',
                      fontSize: '12px',
                       border: '1px solid #d1d5db',
                       borderRadius: '8px',
                       outline: 'none',
                       background: loadingPartyList ? '#f9fafb' : '#ffffff',
                       boxSizing: 'border-box',
                       transition: 'all 0.2s ease',
                       boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                     }}
                   />
                  {partyDropdownOpen && (
                    <div
                      style={dropdownPanelStyle}
                      role="listbox"
                      aria-label={`${partyNameFieldLabel} suggestions`}
                    >
                      {loadingPartyList && (
                        <div style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                          Loading…
                        </div>
                      )}
                      {!loadingPartyList &&
                        partyType === 'customer' &&
                        filteredCustomers.length === 0 && (
                        <div style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                          No matching {noMatchPartyLabel} found.
                        </div>
                      )}
                      {!loadingPartyList &&
                        partyType === 'vendor' &&
                        filteredVendors.length === 0 && (
                        <div style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                          No matching {noMatchPartyLabel} found.
                        </div>
                      )}
                      {!loadingPartyList &&
                        partyType === 'employee' &&
                        filteredEmployees.length === 0 && (
                        <div style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                          No matching {noMatchPartyLabel} found.
                        </div>
                      )}
                      {!loadingPartyList &&
                        partyType === 'customer' &&
                        filteredCustomers.map((customer, idx) => {
                         const displayName = customer.FirstName 
                           ? `${customer.FirstName}${customer.LastName ? ' ' + customer.LastName : ''}`
                           : customer.Name || customer.CustomerName || 'Unknown';
                         return (
                           <div
                             key={customer.Id}
                             data-dropdown-item="true"
                             onMouseDown={(e) => {
                               e.preventDefault();
                               handleCustomerSelect(customer);
                             }}
                             role="option"
                             style={{
                              padding: '10px 12px',
                               cursor: 'pointer',
                              fontSize: '12px',
                               borderBottom: idx < filteredCustomers.length - 1 ? '1px solid #f1f5f9' : 'none',
                               transition: 'all 0.15s ease',
                               backgroundColor: '#ffffff'
                             }}
                             onMouseEnter={(e) => {
                               e.currentTarget.style.background = '#f8fafc';
                               e.currentTarget.style.transform = 'translateX(2px)';
                             }}
                             onMouseLeave={(e) => {
                               e.currentTarget.style.background = '#ffffff';
                               e.currentTarget.style.transform = 'translateX(0)';
                             }}
                           >
                             <div style={{ 
                              fontWeight: 600,
                               color: '#1e293b',
                               marginBottom: customer.Mobile || customer.MobileNumber ? '4px' : '0',
                              fontSize: '13px',
                               lineHeight: '1.4'
                             }}>
                               {displayName}
                             </div>
                             {customer.Mobile || customer.MobileNumber ? (
                               <div style={{ 
                                 color: '#64748b', 
                                 fontSize: '11px',
                                 fontWeight: 400,
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: '6px'
                               }}>
                                 <span style={{ 
                                   display: 'inline-block',
                                   width: '4px',
                                   height: '4px',
                                   borderRadius: '50%',
                                   background: '#94a3b8',
                                   flexShrink: 0
                                 }}></span>
                                 {customer.Mobile || customer.MobileNumber}
                               </div>
                             ) : null}
                           </div>
                         );
                       })}
                      {!loadingPartyList &&
                        partyType === 'vendor' &&
                        filteredVendors.map((v, idx) => {
                          const displayName = getVendorDisplayName(v);
                          const mob = v.Mobile || v.Phone || v.PhoneNumber;
                          return (
                            <div
                              key={v.Id ?? v.VendorId ?? `v-${idx}`}
                              data-dropdown-item="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleVendorSelect(v);
                              }}
                              role="option"
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                borderBottom: idx < filteredVendors.length - 1 ? '1px solid #f1f5f9' : 'none',
                                transition: 'all 0.15s ease',
                                backgroundColor: '#ffffff'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.transform = 'translateX(2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.transform = 'translateX(0)';
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: '#1e293b',
                                  marginBottom: mob ? '4px' : '0',
                                  fontSize: '13px',
                                  lineHeight: '1.4'
                                }}
                              >
                                {displayName}
                              </div>
                              {mob ? (
                                <div
                                  style={{
                                    color: '#64748b',
                                    fontSize: '11px',
                                    fontWeight: 400,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: '4px',
                                      height: '4px',
                                      borderRadius: '50%',
                                      background: '#94a3b8',
                                      flexShrink: 0
                                    }}
                                  />
                                  {mob}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      {!loadingPartyList &&
                        partyType === 'employee' &&
                        filteredEmployees.map((emp, idx) => {
                          const displayName = getEmployeeDisplayName(emp);
                          const mob = emp.Mobile || emp.Phone || emp.ContactNo || emp.contactNo;
                          return (
                            <div
                              key={emp.Id ?? `e-${idx}`}
                              data-dropdown-item="true"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleEmployeeSelect(emp);
                              }}
                              role="option"
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                borderBottom: idx < filteredEmployees.length - 1 ? '1px solid #f1f5f9' : 'none',
                                transition: 'all 0.15s ease',
                                backgroundColor: '#ffffff'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.transform = 'translateX(2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.transform = 'translateX(0)';
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: '#1e293b',
                                  marginBottom: mob ? '4px' : '0',
                                  fontSize: '13px',
                                  lineHeight: '1.4'
                                }}
                              >
                                {displayName}
                              </div>
                              {mob ? (
                                <div
                                  style={{
                                    color: '#64748b',
                                    fontSize: '11px',
                                    fontWeight: 400,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: '4px',
                                      height: '4px',
                                      borderRadius: '50%',
                                      background: '#94a3b8',
                                      flexShrink: 0
                                    }}
                                  />
                                  {mob}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                     </div>
                   )}
                 </div>
                 {partyType === 'customer' && (
                 <button
                   type="button"
                  onClick={() => setShowCustomerSidebar(true)}
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     padding: '10px 12px',
                     fontSize: '14px',
                     fontWeight: 600,
                     borderRadius: '8px',
                     border: '1px solid #3b82f6',
                     background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                     color: '#ffffff',
                     cursor: 'pointer',
                     transition: 'all 0.2s ease',
                     boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                     minWidth: '44px',
                     height: '40px',
                     flexShrink: 0
                   }}
                   title="Add New Customer"
                   onMouseEnter={(e) => {
                     e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                     e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                     e.currentTarget.style.transform = 'translateY(-1px)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                     e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                     e.currentTarget.style.transform = 'translateY(0)';
                   }}
                 >
                   <FaUserPlus />
                 </button>
                 )}
               </div>
             </div>

            {/* Mobile */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#475569', 
                marginBottom: '4px' 
              }}>
                {partyType === 'customer'
                  ? 'Customer Mobile'
                  : partyType === 'vendor'
                    ? 'Vendor Mobile'
                    : 'Employee Mobile'}
              </label>
              <input
                type="text"
                value={customerMobile}
                placeholder="Mobile"
                readOnly
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  background: '#f8fafc',
                  color: '#475569'
                }}
              />
            </div>

          </div>
        </div>
