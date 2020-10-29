"use strict";
/*
 * dnssd-client.ts
 *
 * Copyright (C) 2017 David Lechner <david@lechnology.com>
 *
 * Based on dnssd_clientstub.c:
 * Copyright (c) 2003-2015, Apple Computer, Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1.  Redistributions of source code must retain the above copyright notice,
 *     this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright notice,
 *     this list of conditions and the following disclaimer in the documentation
 *     and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of its
 *     contributors may be used to endorse or promote products derived from this
 *     software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const net = require("net");
const process = require("process");
const util = require("util");
const VERSION = 1;
const MDNS_UDS_SERVERPATH = '/var/run/mDNSResponder';
const MDNS_TCP_SERVERADDR = '127.0.0.1';
const CTL_PATH_PREFIX = '/tmp/dnssd_clippath.';
const USE_TCP_LOOPBACK = !fs.existsSync(MDNS_UDS_SERVERPATH);
const SIZEOF_HEADER = 28;
//const IPC_FLAGS_NOREPLY: number = 1;
const IPC_FLAGS_REUSE_SOCKET = 2;
var RequestOp;
(function (RequestOp) {
    RequestOp[RequestOp["None"] = 0] = "None";
    RequestOp[RequestOp["Connection"] = 1] = "Connection";
    RequestOp[RequestOp["RegRecord"] = 2] = "RegRecord";
    RequestOp[RequestOp["RemoveRecord"] = 3] = "RemoveRecord";
    RequestOp[RequestOp["Enumeration"] = 4] = "Enumeration";
    RequestOp[RequestOp["RegService"] = 5] = "RegService";
    RequestOp[RequestOp["Browse"] = 6] = "Browse";
    RequestOp[RequestOp["Resolve"] = 7] = "Resolve";
    RequestOp[RequestOp["Query"] = 8] = "Query";
    RequestOp[RequestOp["ReconfirmRecord"] = 9] = "ReconfirmRecord";
    RequestOp[RequestOp["AddRecord"] = 10] = "AddRecord";
    RequestOp[RequestOp["UpdateRecord"] = 11] = "UpdateRecord";
    RequestOp[RequestOp["SetDomain"] = 12] = "SetDomain";
    RequestOp[RequestOp["GetProperty"] = 13] = "GetProperty";
    RequestOp[RequestOp["PortMapping"] = 14] = "PortMapping";
    RequestOp[RequestOp["AddrInfo"] = 15] = "AddrInfo";
    RequestOp[RequestOp["SendBPF"] = 16] = "SendBPF";
    RequestOp[RequestOp["GetPID"] = 17] = "GetPID";
    RequestOp[RequestOp["Release"] = 18] = "Release";
    RequestOp[RequestOp["ConnectionDelegate"] = 19] = "ConnectionDelegate";
    RequestOp[RequestOp["Cancel"] = 63] = "Cancel";
})(RequestOp || (RequestOp = {}));
var ReplyOp;
(function (ReplyOp) {
    ReplyOp[ReplyOp["Enumeration"] = 64] = "Enumeration";
    ReplyOp[ReplyOp["RegService"] = 65] = "RegService";
    ReplyOp[ReplyOp["Browse"] = 66] = "Browse";
    ReplyOp[ReplyOp["Resolve"] = 67] = "Resolve";
    ReplyOp[ReplyOp["Query"] = 68] = "Query";
    ReplyOp[ReplyOp["RegRecord"] = 69] = "RegRecord";
    ReplyOp[ReplyOp["GetProperty"] = 70] = "GetProperty";
    ReplyOp[ReplyOp["PortMapping"] = 71] = "PortMapping";
    ReplyOp[ReplyOp["AddrInfo"] = 72] = "AddrInfo";
})(ReplyOp || (ReplyOp = {}));
/**
 * Possible error code values.
 */
var ServiceErrorType;
(function (ServiceErrorType) {
    ServiceErrorType[ServiceErrorType["NoError"] = 0] = "NoError";
    ServiceErrorType[ServiceErrorType["Unknown"] = -65537] = "Unknown";
    ServiceErrorType[ServiceErrorType["NoSuchName"] = -65538] = "NoSuchName";
    ServiceErrorType[ServiceErrorType["NoMemory"] = -65539] = "NoMemory";
    ServiceErrorType[ServiceErrorType["BadParam"] = -65540] = "BadParam";
    ServiceErrorType[ServiceErrorType["BadReference"] = -65541] = "BadReference";
    ServiceErrorType[ServiceErrorType["BadState"] = -65542] = "BadState";
    ServiceErrorType[ServiceErrorType["BadFlags"] = -65543] = "BadFlags";
    ServiceErrorType[ServiceErrorType["Unsupported"] = -65544] = "Unsupported";
    ServiceErrorType[ServiceErrorType["NotInitialized"] = -65545] = "NotInitialized";
    ServiceErrorType[ServiceErrorType["AlreadyRegistered"] = -65547] = "AlreadyRegistered";
    ServiceErrorType[ServiceErrorType["NameConflict"] = -65548] = "NameConflict";
    ServiceErrorType[ServiceErrorType["Invalid"] = -65549] = "Invalid";
    ServiceErrorType[ServiceErrorType["Firewall"] = -65550] = "Firewall";
    ServiceErrorType[ServiceErrorType["Incompatible"] = -65551] = "Incompatible";
    ServiceErrorType[ServiceErrorType["BadInterfaceIndex"] = -65552] = "BadInterfaceIndex";
    ServiceErrorType[ServiceErrorType["Refused"] = -65553] = "Refused";
    ServiceErrorType[ServiceErrorType["NoSuchRecord"] = -65554] = "NoSuchRecord";
    ServiceErrorType[ServiceErrorType["NoAuth"] = -65555] = "NoAuth";
    ServiceErrorType[ServiceErrorType["NoSuchKey"] = -65556] = "NoSuchKey";
    ServiceErrorType[ServiceErrorType["NATTraversal"] = -65557] = "NATTraversal";
    ServiceErrorType[ServiceErrorType["DoubleNAT"] = -65558] = "DoubleNAT";
    ServiceErrorType[ServiceErrorType["BadTime"] = -65559] = "BadTime";
})(ServiceErrorType = exports.ServiceErrorType || (exports.ServiceErrorType = {}));
/**
 * Wraps ServiceErrorType for throwing exceptions.
 */
class ServiceError extends Error {
    /**
     * Creates a new instance of ServiceError.
     * @param code The error code.
     * @param message A useful message.
     */
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ServiceError = ServiceError;
/**
 * General flags used in functions.
 */
var ServiceFlags;
(function (ServiceFlags) {
    /**
     * MoreComing indicates to a callback that at least one more result is
     * queued and will be delivered following immediately after this one.
     * Applications should not update their UI to display browse
     * results when the MoreComing flag is set, because this would
     * result in a great deal of ugly flickering on the screen.
     * Applications should instead wait until until MoreComing is not set,
     * and then update their UI.
     *
     * When MoreComing is not set, that doesn't mean there will be no more
     * answers EVER, just that there are no more answers immediately
     * available right now at this instant. If more answers become available
     * in the future they will be delivered as usual.
     */
    ServiceFlags[ServiceFlags["MoreComing"] = 1] = "MoreComing";
    /**
     * Flag for domain enumeration and browse/query reply callbacks.
     * An enumeration callback with the "Add" flag NOT set indicates a "Remove",
     * i.e. the domain is no longer valid.
     */
    ServiceFlags[ServiceFlags["Add"] = 2] = "Add";
    /**
     * Flag for domain enumeration and browse/query reply callbacks.
     * "Default" applies only to enumeration and is only valid in
     * conjunction with "Add".
     */
    ServiceFlags[ServiceFlags["Default"] = 4] = "Default";
    /**
     * Flag for specifying renaming behavior on name conflict when registering
     * non-shared records. By default, name conflicts are automatically handled
     * by renaming the service.  NoAutoRename overrides this behavior - with this
     * flag set, name conflicts will result in a callback.  The NoAutoRename flag
     * is only valid if a name is explicitly specified when registering a service
     * (i.e. the default name is not used.)
     */
    ServiceFlags[ServiceFlags["NoAutoRename"] = 8] = "NoAutoRename";
    /**
     * Flag for registering individual records on a connected Service.
     * Shared indicates that there may be multiple records with this name on
     * the network (e.g. PTR records).
     */
    ServiceFlags[ServiceFlags["Shared"] = 16] = "Shared";
    /**
     * Flag for registering individual records on a connected Service.
     * Unique indicates that the record's name is to be unique on the network
     * (e.g. SRV records).
     */
    ServiceFlags[ServiceFlags["Unique"] = 32] = "Unique";
    /**
     * Flag for specifying domain enumeration type in Service.enumerateDomains().
     * Enumerates domains recommended for browsing.
     */
    ServiceFlags[ServiceFlags["BrowseDomains"] = 64] = "BrowseDomains";
    /**
     * Flag for specifying domain enumeration type in Service.enumerateDomains().
     * Enumerates domains recommended for registration.
     */
    ServiceFlags[ServiceFlags["RegistrationDomains"] = 128] = "RegistrationDomains";
    /**
     * Flag for creating a long-lived unicast query for the Service.queryRecord call.
     */
    ServiceFlags[ServiceFlags["LongLivedQuery"] = 256] = "LongLivedQuery";
    /**
     * Flag for creating a record for which we will answer remote queries
     * (queries from hosts more than one hop away; hosts not directly connected
     * to the local link).
     */
    ServiceFlags[ServiceFlags["AllowRemoteQuery"] = 512] = "AllowRemoteQuery";
    /**
     * Flag for signifying that a query or registration should be performed
     * exclusively via multicast DNS, even for a name in a domain (e.g.
     * foo.apple.com.) that would normally imply unicast DNS.
     */
    ServiceFlags[ServiceFlags["ForceMulticast"] = 1024] = "ForceMulticast";
    /**
     * Client guarantees that record names are unique, so we can skip sending out initial
     * probe messages.  Standard name conflict resolution is still done if a conflict is discovered.
     * Currently only valid for a DNSServiceRegister call.
     */
    ServiceFlags[ServiceFlags["KnownUnique"] = 2048] = "KnownUnique";
    /**
     * Flag for returning intermediate results.
     * For example, if a query results in an authoritative NXDomain (name does not exist)
     * then that result is returned to the client. However the query is not implicitly
     * cancelled -- it remains active and if the answer subsequently changes
     * (e.g. because a VPN tunnel is subsequently established) then that positive
     * result will still be returned to the client.
     * Similarly, if a query results in a CNAME record, then in addition to following
     * the CNAME referral, the intermediate CNAME result is also returned to the client.
     * When this flag is not set, NXDomain errors are not returned, and CNAME records
     * are followed silently without informing the client of the intermediate steps.
     * (In earlier builds this flag was briefly calledReturnCNAME)
     */
    ServiceFlags[ServiceFlags["ReturnIntermediates"] = 4096] = "ReturnIntermediates";
    /**
     * A service registered with the NonBrowsable flag set can be resolved using
     * DNSServiceResolve(), but will not be discoverable using DNSServiceBrowse().
     * This is for cases where the name is actually a GUID; it is found by other means;
     * there is no end-user benefit to browsing to find a long list of opaque GUIDs.
     * Using the NonBrowsable flag creates SRV+TXT without the cost of also advertising
     * an associated PTR record.
     */
    ServiceFlags[ServiceFlags["NonBrowsable"] = 8192] = "NonBrowsable";
    /**
     * For efficiency, clients that perform many concurrent operations may want to use a
     * single Unix Domain Socket connection with the background daemon, instead of having a
     * separate connection for each independent operation. To use this mode, clients first
     * call DNSServiceCreateConnection(&MainRef) to initialize the main DNSServiceRef.
     * For each subsequent operation that is to share that same connection, the client copies
     * the MainRef, and then passes the address of that copy, setting the ShareConnection flag
     * to tell the library that this DNSServiceRef is not a typical uninitialized DNSServiceRef;
     * it's a copy of an existing DNSServiceRef whose connection information should be reused.
     *
     * For example:
     *
     * DNSServiceErrorType error;
     * DNSServiceRef MainRef;
     * error = DNSServiceCreateConnection(&MainRef);
     * if (error) ...
     * DNSServiceRef BrowseRef = MainRef;  // Important: COPY the primary DNSServiceRef first...
     * error = DNSServiceBrowse(&BrowseRef, ShareConnection, ...); // then use the copy
     * if (error) ...
     * ...
     * DNSServiceRefDeallocate(BrowseRef); // Terminate the browse operation
     * DNSServiceRefDeallocate(MainRef);   // Terminate the shared connection
     * Also see Point 4.(Don't Double-Deallocate if the MainRef has been Deallocated) in Notes below:
     *
     * Notes:
     *
     * 1. Collective MoreComing flag
     * When callbacks are invoked using a shared DNSServiceRef, the
     * MoreComing flag applies collectively to *all* active
     * operations sharing the same parent DNSServiceRef. If the MoreComing flag is
     * set it means that there are more results queued on this parent DNSServiceRef,
     * but not necessarily more results for this particular callback function.
     * The implication of this for client programmers is that when a callback
     * is invoked with the MoreComing flag set, the code should update its
     * internal data structures with the new result, and set a variable indicating
     * that its UI needs to be updated. Then, later when a callback is eventually
     * invoked with the MoreComing flag not set, the code should update *all*
     * stale UI elements related to that shared parent DNSServiceRef that need
     * updating, not just the UI elements related to the particular callback
     * that happened to be the last one to be invoked.
     *
     * 2. Canceling operations and MoreComing
     * Whenever you cancel any operation for which you had deferred UI updates
     * waiting because of a MoreComing flag, you should perform
     * those deferred UI updates. This is because, after cancelling the operation,
     * you can no longer wait for a callback *without* MoreComing set, to tell
     * you do perform your deferred UI updates (the operation has been canceled,
     * so there will be no more callbacks). An implication of the collective
     * MoreComing flag for shared connections is that this
     * guideline applies more broadly -- any time you cancel an operation on
     * a shared connection, you should perform all deferred UI updates for all
     * operations sharing that connection. This is because the MoreComing flag
     * might have been referring to events coming for the operation you canceled,
     * which will now not be coming because the operation has been canceled.
     *
     * 3. Only share DNSServiceRef's created with DNSServiceCreateConnection
     * Calling DNSServiceCreateConnection(&ref) creates a special shareable DNSServiceRef.
     * DNSServiceRef's created by other calls like DNSServiceBrowse() or DNSServiceResolve()
     * cannot be shared by copying them and using ShareConnection.
     *
     * 4. Don't Double-Deallocate if the MainRef has been Deallocated
     * Calling DNSServiceRefDeallocate(ref) for a particular operation's DNSServiceRef terminates
     * just that operation. Calling DNSServiceRefDeallocate(ref) for the main shared DNSServiceRef
     * (the parent DNSServiceRef, originally created by DNSServiceCreateConnection(&ref))
     * automatically terminates the shared connection and all operations that were still using it.
     * After doing this, DO NOT then attempt to deallocate any remaining subordinate DNSServiceRef's.
     * The memory used by those subordinate DNSServiceRef's has already been freed, so any attempt
     * to do a DNSServiceRefDeallocate (or any other operation) on them will result in accesses
     * to freed memory, leading to crashes or other equally undesirable results.
     *
     * 5. Thread Safety
     * The dns_sd.h API does not presuppose any particular threading model, and consequently
     * does no locking internally (which would require linking with a specific threading library).
     * If the client concurrently, from multiple threads (or contexts), calls API routines using
     * the same DNSServiceRef, it is the client's responsibility to provide mutual exclusion for
     * that DNSServiceRef.

     * For example, use of DNSServiceRefDeallocate requires caution. A common mistake is as follows:
     * Thread B calls DNSServiceRefDeallocate to deallocate sdRef while Thread A is processing events
     * using sdRef. Doing this will lead to intermittent crashes on thread A if the sdRef is used after
     * it was deallocated.

     * A telltale sign of this crash type is to see DNSServiceProcessResult on the stack preceding the
     * actual crash location.

     * To state this more explicitly, mDNSResponder does not queue DNSServiceRefDeallocate so
     * that it occurs discretely before or after an event is handled.
     */
    ServiceFlags[ServiceFlags["ShareConnection"] = 16384] = "ShareConnection";
    /*
     * This flag is meaningful only in DNSServiceQueryRecord which suppresses unusable queries on the
     * wire. If "hostname" is a wide-area unicast DNS hostname (i.e. not a ".local." name)
     * but this host has no routable IPv6 address, then the call will not try to look up IPv6 addresses
     * for "hostname", since any addresses it found would be unlikely to be of any use anyway. Similarly,
     * if this host has no routable IPv4 address, the call will not try to look up IPv4 addresses for
     * "hostname".
     */
    ServiceFlags[ServiceFlags["SuppressUnusable"] = 32768] = "SuppressUnusable";
    /**
     * When kDNServiceFlagsTimeout is passed to DNSServiceQueryRecord or DNSServiceGetAddrInfo, the query is
     * stopped after a certain number of seconds have elapsed. The time at which the query will be stopped
     * is determined by the system and cannot be configured by the user. The query will be stopped irrespective
     * of whether a response was given earlier or not. When the query is stopped, the callback will be called
     * with an error code of kDNSServiceErr_Timeout and a NULL sockaddr will be returned for DNSServiceGetAddrInfo
     * and zero length rdata will be returned for DNSServiceQueryRecord.
     */
    ServiceFlags[ServiceFlags["Timeout"] = 65536] = "Timeout";
    /**
     * Include P2P interfaces when kDNSServiceInterfaceIndexAny is specified.
     * By default, specifying kDNSServiceInterfaceIndexAny does not include P2P interfaces.
     */
    ServiceFlags[ServiceFlags["IncludeP2P"] = 131072] = "IncludeP2P";
    /**
     * This flag is meaningful only in DNSServiceResolve. When set, it tries to send a magic packet
     * to wake up the client.
     */
    ServiceFlags[ServiceFlags["WakeOnResolve"] = 262144] = "WakeOnResolve";
    /**
     * This flag is meaningful for Unicast DNS queries. When set, it uses the background traffic
     * class for packets that service the request.
     */
    ServiceFlags[ServiceFlags["BackgroundTrafficClass"] = 524288] = "BackgroundTrafficClass";
    /**
     * Include AWDL interface when kDNSServiceInterfaceIndexAny is specified.
     */
    ServiceFlags[ServiceFlags["IncludeAWDL"] = 1048576] = "IncludeAWDL";
    /**
     * This flag is meaningful in DNSServiceGetAddrInfo and DNSServiceQueryRecord. This is the ONLY flag to be valid
     * as an input to the APIs and also an output through the callbacks in the APIs.
     *
     * When this flag is passed to DNSServiceQueryRecord and DNSServiceGetAddrInfo to resolve unicast names,
     * the response  will be validated using DNSSEC. The validation results are delivered using the flags field in
     * the callback and Validate is marked in the flags to indicate that DNSSEC status is also available.
     * When the callback is called to deliver the query results, the validation results may or may not be available.
     * If it is not delivered along with the results, the validation status is delivered when the validation completes.
     *
     * When the validation results are delivered in the callback, it is indicated by marking the flags with
     * Validate and Add along with the DNSSEC status flags (described below) and a NULL
     * sockaddr will be returned for DNSServiceGetAddrInfo and zero length rdata will be returned for DNSServiceQueryRecord.
     * DNSSEC validation results are for the whole RRSet and not just individual records delivered in the callback. When
     * Add is not set in the flags, applications should implicitly assume that the DNSSEC status of the
     * RRSet that has been delivered up until that point is not valid anymore, till another callback is called with
     * Add and Validate.
     *
     * The following four flags indicate the status of the DNSSEC validation and marked in the flags field of the callback.
     * When any of the four flags is set, Validate will also be set. To check the validation status, the
     * other applicable output flags should be masked. See kDNSServiceOutputFlags below.
     */
    ServiceFlags[ServiceFlags["Validate"] = 2097152] = "Validate";
    /**
     * The response has been validated by verifying all the signatures in the response and was able to
     * build a successful authentication chain starting from a known trust anchor.
     */
    ServiceFlags[ServiceFlags["Secure"] = 2097168] = "Secure";
    /**
     * A chain of trust cannot be built starting from a known trust anchor to the response.
     */
    ServiceFlags[ServiceFlags["Insecure"] = 2097184] = "Insecure";
    /**
     * If the response cannot be verified to be secure due to expired signatures, missing signatures etc.,
     * then the results are considered to be bogus.
     */
    ServiceFlags[ServiceFlags["Bogus"] = 2097216] = "Bogus";
    /**
     * There is no valid trust anchor that can be used to determine whether a response is secure or not.
     */
    ServiceFlags[ServiceFlags["Indeterminate"] = 2097280] = "Indeterminate";
    /**
     * Request unicast response to query.
     */
    ServiceFlags[ServiceFlags["UnicastResponse"] = 4194304] = "UnicastResponse";
    /**
     * This flag is identical to Validate except for the case where the response
     * cannot be validated. If this flag is set in DNSServiceQueryRecord or DNSServiceGetAddrInfo,
     * the DNSSEC records will be requested for validation. If they cannot be received for some reason
     * during the validation (e.g., zone is not signed, zone is signed but cannot be traced back to
     * root, recursive server does not understand DNSSEC etc.), then this will fallback to the default
     * behavior where the validation will not be performed and no DNSSEC results will be provided.
     *
     * If the zone is signed and there is a valid path to a known trust anchor configured in the system
     * and the application requires DNSSEC validation irrespective of the DNSSEC awareness in the current
     * network, then this option MUST not be used. This is only intended to be used during the transition
     * period where the different nodes participating in the DNS resolution may not understand DNSSEC or
     * managed properly (e.g. missing DS record) but still want to be able to resolve DNS successfully.
     */
    ServiceFlags[ServiceFlags["ValidateOptional"] = 8388608] = "ValidateOptional";
    /**
     * This flag is meaningful only in DNSServiceRegister. When set, the service will not be registered
     * with sleep proxy server during sleep.
     */
    ServiceFlags[ServiceFlags["WakeOnlyService"] = 16777216] = "WakeOnlyService";
    /**
     * ThresholdOne is meaningful only in DNSServiceBrowse. When set,
     * the system will stop issuing browse queries on the network once the number
     * of answers returned is one or more.  It will issue queries on the network
     * again if the number of answers drops to zero.
     * This flag is for Apple internal use only. Third party developers
     * should not rely on this behavior being supported in any given software release.
     */
    ServiceFlags[ServiceFlags["ThresholdOne"] = 33554432] = "ThresholdOne";
    /**
     * ThresholdFinder is meaningful only in DNSServiceBrowse. When set,
     * the system will stop issuing browse queries on the network once the number
     * of answers has reached the threshold set for Finder.
     * It will issue queries on the network again if the number of answers drops below
     * this threshold.
     * This flag is for Apple internal use only. Third party developers
     * should not rely on this behavior being supported in any given software release.
     */
    ServiceFlags[ServiceFlags["ThresholdFinder"] = 67108864] = "ThresholdFinder";
    /**
     * When ThresholdReached is set in the client callback add or remove event,
     * it indicates that the browse answer threshold has been reached and no
     * browse requests will be generated on the network until the number of answers falls
     * below the threshold value.  Add and remove events can still occur based
     * on incoming Bonjour traffic observed by the system.
     * The set of services return to the client is not guaranteed to represent the
     * entire set of services present on the network once the threshold has been reached.
     *
     * Note, while ThresholdReached and ThresholdOne
     * have the same value, there  isn't a conflict because ThresholdReached
     * is only set in the callbacks and ThresholdOne is only set on
     * input to a DNSServiceBrowse call.
     */
    ServiceFlags[ServiceFlags["ThresholdReached"] = 33554432] = "ThresholdReached";
    /**
     * This flag is meaningful only for Unicast DNS queries. When set, the kernel will restrict
     * DNS resolutions on the cellular interface for that request.
     */
    ServiceFlags[ServiceFlags["DenyCellular"] = 134217728] = "DenyCellular";
    /**
     * This flag is meaningful only for DNSServiceGetAddrInfo() for Unicast DNS queries.
     * When set, DNSServiceGetAddrInfo() will interpret the "interfaceIndex" argument of the call
     * as the "serviceIndex".
     */
    ServiceFlags[ServiceFlags["ServiceIndex"] = 268435456] = "ServiceIndex";
    /**
     * This flag is meaningful only for Unicast DNS queries. When set, the kernel will restrict
     * DNS resolutions on interfaces defined as expensive for that request.
     */
    ServiceFlags[ServiceFlags["DenyExpensive"] = 536870912] = "DenyExpensive";
    /**
     * This flag is meaningful for only Unicast DNS queries.
     * When set, it indicates that Network PathEvaluation has already been performed.
     */
    ServiceFlags[ServiceFlags["PathEvaluationDone"] = 1073741824] = "PathEvaluationDone";
})(ServiceFlags = exports.ServiceFlags || (exports.ServiceFlags = {}));
/**
 * Service record types.
 */
var ServiceType;
(function (ServiceType) {
    /**
     * Host address.
     */
    ServiceType[ServiceType["A"] = 1] = "A";
    /**
     * Authoritative server.
     */
    ServiceType[ServiceType["NS"] = 2] = "NS";
    /**
     * Mail destination.
     */
    ServiceType[ServiceType["MD"] = 3] = "MD";
    /**
     * Mail forwarder.
     */
    ServiceType[ServiceType["MF"] = 4] = "MF";
    /**
     * Canonical name.
     */
    ServiceType[ServiceType["CNAME"] = 5] = "CNAME";
    /**
     * Start of authority zone.
     */
    ServiceType[ServiceType["SOA"] = 6] = "SOA";
    /**
     * Mailbox domain name.
     */
    ServiceType[ServiceType["MB"] = 7] = "MB";
    /**
     * Mail group member.
     */
    ServiceType[ServiceType["MG"] = 8] = "MG";
    /**
     * Mail rename name.
     */
    ServiceType[ServiceType["MR"] = 9] = "MR";
    /**
     * Null resource record.
     */
    ServiceType[ServiceType["NULL"] = 10] = "NULL";
    /**
     * Well known service.
     */
    ServiceType[ServiceType["WKS"] = 11] = "WKS";
    /**
     * Domain name pointer.
     */
    ServiceType[ServiceType["PTR"] = 12] = "PTR";
    /**
     * Host information.
     */
    ServiceType[ServiceType["HINFO"] = 13] = "HINFO";
    /**
     * Mailbox information.
     */
    ServiceType[ServiceType["MINFO"] = 14] = "MINFO";
    /**
     * Mail routing information.
     */
    ServiceType[ServiceType["MX"] = 15] = "MX";
    /**
     * One or more text strings.
     */
    ServiceType[ServiceType["TXT"] = 16] = "TXT";
    /**
     * Responsible person.
     */
    ServiceType[ServiceType["RP"] = 17] = "RP";
    /**
     * AFS cell database.
     */
    ServiceType[ServiceType["AFSDB"] = 18] = "AFSDB";
    /**
     * X_25 calling address.
     */
    ServiceType[ServiceType["X25"] = 19] = "X25";
    /**
     * ISDN calling address.
     */
    ServiceType[ServiceType["ISDN"] = 20] = "ISDN";
    /**
     * Router.
     */
    ServiceType[ServiceType["RT"] = 21] = "RT";
    /**
     * NSAP address.
     */
    ServiceType[ServiceType["NSAP"] = 22] = "NSAP";
    /**
     * Reverse NSAP lookup (deprecated).
     */
    ServiceType[ServiceType["NSAP_PTR"] = 23] = "NSAP_PTR";
    /**
     * Security signature.
     */
    ServiceType[ServiceType["SIG"] = 24] = "SIG";
    /**
     * Security key.
     */
    ServiceType[ServiceType["KEY"] = 25] = "KEY";
    /**
     * X.400 mail mapping.
     */
    ServiceType[ServiceType["PX"] = 26] = "PX";
    /**
     * Geographical position (withdrawn).
     */
    ServiceType[ServiceType["GPOS"] = 27] = "GPOS";
    /**
     * Ip6 Address.
     */
    ServiceType[ServiceType["AAAA"] = 28] = "AAAA";
    /**
     * Location Information.
     */
    ServiceType[ServiceType["LOC"] = 29] = "LOC";
    /**
     * Next domain (security).
     */
    ServiceType[ServiceType["NXT"] = 30] = "NXT";
    /**
     * Endpoint identifier.
     */
    ServiceType[ServiceType["EID"] = 31] = "EID";
    /**
     * Nimrod Locator.
     */
    ServiceType[ServiceType["NIMLOC"] = 32] = "NIMLOC";
    /**
     * Server Selection.
     */
    ServiceType[ServiceType["SRV"] = 33] = "SRV";
    /**
     * ATM Address
     */
    ServiceType[ServiceType["ATMA"] = 34] = "ATMA";
    /**
     * Naming Authority PoinTeR
     */
    ServiceType[ServiceType["NAPTR"] = 35] = "NAPTR";
    /**
     * Key Exchange
     */
    ServiceType[ServiceType["KX"] = 36] = "KX";
    /**
     * Certification record
     */
    ServiceType[ServiceType["CERT"] = 37] = "CERT";
    /**
     * IPv6 address (deprecates AAAA)
     */
    ServiceType[ServiceType["A6"] = 38] = "A6";
    /**
     * Non-terminal DNAME (for IPv6)
     */
    ServiceType[ServiceType["DNAME"] = 39] = "DNAME";
    /**
     * Kitchen sink (experimentatl)
     */
    ServiceType[ServiceType["SINK"] = 40] = "SINK";
    /**
     * EDNS0 option (meta-RR)
     */
    ServiceType[ServiceType["OPT"] = 41] = "OPT";
    /**
     * Transaction key
     */
    ServiceType[ServiceType["TKEY"] = 249] = "TKEY";
    /**
     * Transaction signature.
     */
    ServiceType[ServiceType["TSIG"] = 250] = "TSIG";
    /**
     * Incremental zone transfer.
     */
    ServiceType[ServiceType["IXFR"] = 251] = "IXFR";
    /**
     * Transfer zone of authority.
     */
    ServiceType[ServiceType["AXFR"] = 252] = "AXFR";
    /**
     * Transfer mailbox records.
     */
    ServiceType[ServiceType["MAILB"] = 253] = "MAILB";
    /**
     * Transfer mail agent records.
     */
    ServiceType[ServiceType["MAILA"] = 254] = "MAILA";
    /**
     * Wildcard match.
     */
    ServiceType[ServiceType["ANY"] = 255] = "ANY";
})(ServiceType = exports.ServiceType || (exports.ServiceType = {}));
/**
 * Service record classes.
 */
var ServiceClass;
(function (ServiceClass) {
    /**
     * Internet
     */
    ServiceClass[ServiceClass["IN"] = 1] = "IN";
})(ServiceClass = exports.ServiceClass || (exports.ServiceClass = {}));
/**
 * Possible protocol values.
 */
var ServiceProtocol;
(function (ServiceProtocol) {
    /**
     * for Service.getAddrInfo()
     */
    ServiceProtocol[ServiceProtocol["IPv4"] = 1] = "IPv4";
    /**
     * for Service.getAddrInfo()
     */
    ServiceProtocol[ServiceProtocol["IPv6"] = 2] = "IPv6";
    /**
     * for Service.natPortMappingCreate()
     */
    ServiceProtocol[ServiceProtocol["UDP"] = 16] = "UDP";
    /**
     * for Service.natPortMappingCreate()
     */
    ServiceProtocol[ServiceProtocol["TCP"] = 32] = "TCP";
})(ServiceProtocol = exports.ServiceProtocol || (exports.ServiceProtocol = {}));
/**
 * Runtime check to see if mDNSResponder daemon is running.
 * @return true if it is running
 */
function checkDaemonRunning() {
    // FIXME: need to handle USE_TCP_LOOPBACK
    return fs.existsSync(MDNS_UDS_SERVERPATH);
}
exports.checkDaemonRunning = checkDaemonRunning;
/**
 * Object that represents a connection to the mDNSResponder daemon. Instances
 * should be created using the static methods.
 */
class Service {
    constructor(socket) {
        this.socket = socket;
        this.op = RequestOp.None;
    }
    static connectToServer() {
        return new Promise((resolve, reject) => {
            const socket = net.createConnection(MDNS_UDS_SERVERPATH);
            socket.once('connect', () => {
                resolve(new Service(socket));
            });
            socket.once('error', (err) => {
                reject(err);
            });
        });
    }
    deliverRequest(msg, reuseSd) {
        return __awaiter(this, void 0, void 0, function* () {
            let listenServer;
            let errSocket;
            if (!reuseSd) {
                listenServer = net.createServer(socket => {
                    errSocket = socket;
                });
                if (USE_TCP_LOOPBACK) {
                    const port = msg.readUInt16BE(SIZEOF_HEADER);
                    listenServer.listen(port, MDNS_TCP_SERVERADDR);
                }
                else {
                    const nullTermIndex = msg.indexOf(0, SIZEOF_HEADER);
                    const path = msg.toString(undefined, SIZEOF_HEADER, nullTermIndex);
                    listenServer.listen(path);
                }
            }
            yield this.write(msg);
            try {
                // FIXME: check errSocket instead if !reuseSd
                const data = yield this.read(4);
                const err = data.readUInt32BE(0);
                if (err !== 0) {
                    throw new ServiceError(err, 'Request error');
                }
            }
            finally {
                if (listenServer) {
                    listenServer.close();
                }
                if (errSocket) {
                    errSocket.destroy();
                }
            }
        });
    }
    /**
     * Read a reply from the daemon, calling the appropriate application callback. Note that the
     * client is responsible for ensuring that processResult() is called whenever there is
     * a reply from the daemon - the daemon may terminate its connection with a client that does not
     * process the daemon's responses.
     */
    processResult() {
        return __awaiter(this, void 0, void 0, function* () {
            const headerBuf = yield this.read(SIZEOF_HEADER);
            const header = {
                version: headerBuf.readUInt32BE(0),
                dataLen: headerBuf.readUInt32BE(4),
                flags: headerBuf.readUInt32BE(8),
                op: headerBuf.readUInt32BE(12),
                context0: headerBuf.readUInt32BE(16),
                context1: headerBuf.readUInt32BE(20),
                regIndex: headerBuf.readUInt32BE(24),
            };
            if (header.version !== VERSION) {
                throw new ServiceError(ServiceErrorType.Incompatible, 'Incompatible version');
            }
            const data = yield this.read(header.dataLen);
            if (this.processReply) {
                this.processReply(header, data);
            }
        });
    }
    /**
     * Terminate a connection with the daemon.
     * Any services or records registered with this object will be unregistered. Any
     * Browse, Resolve, or Query operations called with this object will be terminated.
     *
     * Note: If the object's underlying socket is used in a run loop or select() call, it should
     * be removed BEFORE destroy() is called, as this function closes the object's
     * socket.
     */
    destroy() {
        this.socket.destroy();
    }
    read(size) {
        const data = this.socket.read(size);
        if (data) {
            return Promise.resolve(data);
        }
        return new Promise((resolve, reject) => {
            this.socket.once('readable', () => {
                const data = this.socket.read(size);
                resolve(data);
            });
        });
    }
    write(msg) {
        if (this.socket.write(msg)) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            this.socket.once('drain', () => resolve());
        });
    }
    static createHeader(op, length, reuseSocket) {
        let ctrlPathOrPort;
        let ctrlPathOrPortSize = 0;
        if (!reuseSocket) {
            if (USE_TCP_LOOPBACK) {
                ctrlPathOrPort = Buffer.alloc(2);
                ctrlPathOrPortSize = 2; // for port number
            }
            else {
                const now = Date.now();
                const ctrlPath = util.format('%s%d-%s-%d\0', CTL_PATH_PREFIX, process.pid, (Math.floor(now / 1000000) & 0xFFFF).toString(16), now % 1000000);
                ctrlPathOrPort = Buffer.from(ctrlPath);
                ctrlPathOrPortSize = ctrlPathOrPort.length;
            }
        }
        const msg = Buffer.alloc(SIZEOF_HEADER + ctrlPathOrPortSize + length);
        let flags = 0;
        if (reuseSocket) {
            flags |= IPC_FLAGS_REUSE_SOCKET;
        }
        let offset = 0;
        offset = msg.writeUInt32BE(1, offset); // version = 1
        offset = msg.writeUInt32BE(ctrlPathOrPortSize + length, offset); // datalen
        offset = msg.writeUInt32BE(flags, offset);
        offset = msg.writeUInt32BE(op, offset);
        offset = msg.writeUInt32BE(0, offset); // context[0]
        offset = msg.writeUInt32BE(0, offset); // context[1]
        offset = msg.writeUInt32BE(0, offset); // reg_index
        if (!reuseSocket && ctrlPathOrPort) {
            offset += ctrlPathOrPort.copy(msg, offset);
        }
        return [msg, offset];
    }
    /**
     * Browse for instances of a service.
     *
     * @param flags     Currently ignored, reserved for future use.
     * @param iface     If non-zero, specifies the interface on which to browse for services
     *                  (the index for a given interface is determined via the if_nametoindex()
     *                  family of calls.)  Most applications will pass 0 to browse on all available
     *                  interfaces. See "Constants for specifying an interface index" for more details.
     * @param type      The service type being browsed for followed by the protocol, separated by a
     *                  dot (e.g. "_ftp._tcp").  The transport protocol must be "_tcp" or "_udp".
     * @param domain    If non-empty, specifies the domain on which to browse for services.
     *                  Most applications will not specify a domain, instead browsing on the
     *                  default domain(s).
     * @param callback  The function to be called when an instance of the service being browsed for
     *                  is found.
     * @return          A promise for a new Service object.
     */
    static browse(flags, iface, type, domain, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const regTypeBuf = Buffer.from(type + '\0');
            const domainBuf = Buffer.from(domain + '\0');
            let length = 4; // size of flags
            length += 4; // size of interfaceIndex
            length += regTypeBuf.length;
            length += domainBuf.length;
            let [msg, offset] = Service.createHeader(RequestOp.Browse, length, true);
            offset = msg.writeUInt32BE(0, offset); // flags
            offset = msg.writeUInt32BE(0, offset); // interfaceIndex = kServiceInterfaceIndexAny
            offset += regTypeBuf.copy(msg, offset);
            offset += domainBuf.copy(msg, offset);
            const service = yield Service.connectToServer();
            yield service.deliverRequest(msg, true);
            service.op = RequestOp.Browse;
            service.processReply = service.handleBrowseResponse;
            service.appCallback = callback;
            return service;
        });
    }
    handleBrowseResponse(header, data) {
        const flags = data.readUInt32BE(0);
        const ifaceIndex = data.readUInt32BE(4);
        let errCode = data.readInt32BE(8);
        let offset = 12;
        let strError = false;
        let replyName, replyType, replyDomain;
        let nullTermIndex = data.indexOf(0, offset);
        if (nullTermIndex < 0) {
            strError = true;
        }
        else {
            replyName = data.toString(undefined, offset, nullTermIndex);
            offset = nullTermIndex + 1;
        }
        nullTermIndex = data.indexOf(0, offset);
        if (nullTermIndex < 0) {
            strError = true;
        }
        else {
            replyType = data.toString(undefined, offset, nullTermIndex);
            offset = nullTermIndex + 1;
        }
        nullTermIndex = data.indexOf(0, offset);
        if (nullTermIndex < 0) {
            strError = true;
        }
        else {
            replyDomain = data.toString(undefined, offset, nullTermIndex);
            offset = nullTermIndex + 1;
        }
        if (!errCode && strError) {
            errCode = ServiceErrorType.Unknown;
        }
        this.appCallback(this, flags, ifaceIndex, errCode, replyName || '', replyType || '', replyDomain || '');
    }
    /**
     * Resolve a service name discovered via browse() to a target host name, port number, and
     * txt record.
     *
     * Note: Applications should NOT use resolve() solely for txt record monitoring - use
     * queryRecord() instead, as it is more efficient for this task.
     *
     * Note: When the desired results have been returned, the client MUST terminate the resolve by calling
     * destroy().
     *
     * Note: resolve() behaves correctly for typical services that have a single SRV record
     * and a single TXT record. To resolve non-standard services with multiple SRV or TXT records,
     * queryRecord() should be used.
     *
     * @param flags     Currently ignored, reserved for future use.
     *
     * @param iface     The interface on which to resolve the service. If this resolve call is
     *                  as a result of a currently active browse() operation, then the
     *                  iface should be the index reported in the BrowseReply
     *                  callback. If this resolve call is using information previously saved
     *                  (e.g. in a preference file) for later use, then use iface 0, because
     *                  the desired service may now be reachable via a different physical interface.
     *                  See "Constants for specifying an interface index" for more details.
     *
     * @param name      The name of the service instance to be resolved, as reported to the
     *                  BrowseReply() callback.
     *
     * @param type      The type of the service instance to be resolved, as reported to the
     *                  BrowseReply() callback.
     *
     * @param domain    The domain of the service instance to be resolved, as reported to the
     *                  BrowseReply() callback.
     *
     * @param callback  The function to be called when a result is found.
     *
     * @return          A promise for a Service object. The resolve operation will run
     *                  indefinitely until the client terminates it by calling destroy().
     */
    resolve(flags, iface, name, type, domain, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const nameBuf = Buffer.from(name + '\0');
            const typeBuf = Buffer.from(type + '\0');
            const domainBuf = Buffer.from(domain + '\0');
            let length = 4; // size of flags
            length += 4; // size of interfaceIndex
            length += nameBuf.length;
            length += typeBuf.length;
            length += domainBuf.length;
            let [msg, offset] = Service.createHeader(RequestOp.Resolve, length, true);
            offset = msg.writeUInt32BE(flags, offset);
            offset = msg.writeUInt32BE(iface, offset);
            offset += nameBuf.copy(msg, offset);
            offset += typeBuf.copy(msg, offset);
            offset += domainBuf.copy(msg, offset);
            const service = yield Service.connectToServer();
            yield service.deliverRequest(msg, true);
            service.op = RequestOp.Resolve;
            service.processReply = service.handleResolveResponse;
            service.appCallback = callback;
            return service;
        });
    }
    handleResolveResponse(header, data) {
        const flags = data.readUInt32BE(0);
        const iface = data.readUInt32BE(4);
        let errCode = data.readInt32BE(8);
        let offset = 12;
        let strError = false;
        let fullName, target;
        let nullTermIndex = data.indexOf(0, offset);
        if (nullTermIndex < 0) {
            strError = true;
        }
        else {
            fullName = data.toString(undefined, offset, nullTermIndex);
            offset = nullTermIndex + 1;
        }
        nullTermIndex = data.indexOf(0, offset);
        if (nullTermIndex < 0) {
            strError = true;
        }
        else {
            target = data.toString(undefined, offset, nullTermIndex);
            offset = nullTermIndex + 1;
        }
        const port = data.readUInt16BE(offset);
        const txtLen = data.readUInt16BE(offset + 2);
        offset += 4;
        const end = offset + txtLen;
        const txt = new Array();
        while (offset < end) {
            const len = data.readUInt8(offset);
            offset += 1;
            txt.push(data.toString(undefined, offset, offset + len));
            offset += len;
        }
        if (!errCode && strError) {
            errCode = ServiceErrorType.Unknown;
        }
        this.appCallback(this, flags, iface, errCode, fullName || '', target || '', port, txt);
    }
    /**
     * Queries for the IP address of a hostname by using either Multicast or Unicast DNS.
     * @param flags     ServiceFlags.ForceMulticast
     * @param iface     The interface on which to issue the query.  Passing 0 causes the query to be
     *                  sent on all active interfaces via Multicast or the primary interface via Unicast.
     * @param protocol  Pass in ServiceProtocol.IPv4 to look up IPv4 addresses, or ServiceProtocol.IPv6
     *                  to look up IPv6 addresses, or both to look up both kinds. If neither flag is
     *                  set, the system will apply an intelligent heuristic, which is (currently)
     *                  that it will attempt to look up both, except:
     *                   * If "hostname" is a wide-area unicast DNS hostname (i.e. not a ".local." name)
     *                     but this host has no routable IPv6 address, then the call will not try to
     *                     look up IPv6 addresses for "hostname", since any addresses it found would be
     *                     unlikely to be of any use anyway. Similarly, if this host has no routable
     *                     IPv4 address, the call will not try to look up IPv4 addresses for "hostname".
     * @param hostname  The fully qualified domain name of the host to be queried for.
     * @param callback  The function to be called when the query succeeds or fails asynchronously.
     */
    getAddrInfo(flags, iface, protocol, hostname, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = yield Service.connectToServer();
            service.op = RequestOp.AddrInfo;
            service.processReply = service.handleAddrInfoResponse;
            service.appCallback = callback;
            const hostnameBuf = Buffer.from(hostname + '\0');
            let length = 4; // size of flags
            length += 4; // size of iface
            length += 4; // size of protocol
            length += hostnameBuf.length;
            let [msg, offset] = Service.createHeader(RequestOp.AddrInfo, length, true);
            offset = msg.writeUInt32BE(flags, offset);
            offset = msg.writeUInt32BE(iface, offset);
            offset = msg.writeUInt32BE(protocol, offset);
            offset += hostnameBuf.copy(msg, offset);
            yield service.deliverRequest(msg, true);
            return service;
        });
    }
    handleAddrInfoResponse(header, data) {
        const flags = data.readUInt32BE(0);
        const iface = data.readUInt32BE(4);
        const errCode = data.readUInt32BE(8);
        let offset = 12;
        let strError = false;
        let hostname;
        let nullTermIndex = data.indexOf(0, offset);
        if (nullTermIndex < 0) {
            strError = true;
        }
        else {
            hostname = data.toString(undefined, offset, nullTermIndex);
            offset = nullTermIndex + 1;
        }
        const rrType = data.readUInt16BE(offset + 0);
        const rrClass = data.readUInt16BE(offset + 2);
        const rdLen = data.readUInt16BE(offset + 4);
        offset += 6;
        const rData = Buffer.alloc(rdLen);
        data.copy(rData, 0, offset, offset + rdLen);
        offset += rdLen;
        let ttl = data.readUInt32BE(offset);
        let address;
        switch (rrType) {
            case ServiceType.A: // IPv4
                address = `${rData[0]}.${rData[1]}.${rData[2]}.${rData[3]}`;
                break;
            case ServiceType.AAAA: // IPv6\
                const g0 = rData.readUInt16BE(0).toString(16);
                const g1 = rData.readUInt16BE(2).toString(16);
                const g2 = rData.readUInt16BE(4).toString(16);
                const g3 = rData.readUInt16BE(6).toString(16);
                const g4 = rData.readUInt16BE(8).toString(16);
                const g5 = rData.readUInt16BE(10).toString(16);
                const g6 = rData.readUInt16BE(12).toString(16);
                const g7 = rData.readUInt16BE(14).toString(16);
                address = `${g0}:${g1}:${g2}:${g3}:${g4}:${g5}:${g6}:${g7}`.replace(/(:0)+(?::)/, '::');
                break;
        }
        if (flags & ServiceFlags.Validate) {
            address = undefined;
            ttl = 0;
        }
        this.appCallback(this, flags, iface, errCode, hostname || '', address || '', ttl);
    }
    /**
     * @param flags     Pass ServiceFlags.LongLivedQuery to create a "long-lived" unicast
     *                  query in a non-local domain.  Without setting this flag, unicast queries
     *                  will be one-shot - that is, only answers available at the time of the call
     *                  will be returned.  By setting this flag, answers (including Add and Remove
     *                  events) that become available after the initial call is made will generate
     *                  callbacks.  This flag has no effect on link-local multicast queries.
     * @param iface     If non-zero, specifies the interface on which to issue the query
     *                  (the index for a given interface is determined via the if_nametoindex()
     *                  family of calls.)  Passing 0 causes the name to be queried for on all
     *                  interfaces. See "Constants for specifying an interface index" for more details.
     * @param fullName  The full domain name of the resource record to be queried for.
     * @param rrType    The numerical type of the resource record to be queried for
     *                  (e.g. ServiceType.PTR, ServiceType.SRV, etc)
     * @param rrClass   The class of the resource record (usually ServiceClass.IN).
     * @param callback  The function to be called when a result is found, or if the call
     *                  asynchronously fails.
     */
    queryRecord(flags, iface, fullName, rrType, rrClass, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const nameBuf = Buffer.from(fullName + '\0');
            let length = 4; // size of flags
            length += 4; // size of iface
            length += nameBuf.length;
            length += 2; //size of rrType
            length += 2; //size of rrClass
            let [msg, offset] = Service.createHeader(RequestOp.Query, length, true);
            offset = msg.writeUInt32BE(flags, offset);
            offset = msg.writeUInt32BE(iface, offset);
            offset += nameBuf.copy(msg, offset);
            offset = msg.writeUInt16BE(rrType, offset);
            offset = msg.writeUInt16BE(rrClass, offset);
            const service = yield Service.connectToServer();
            yield service.deliverRequest(msg, true);
            service.op = RequestOp.Query;
            service.processReply = service.handleQueryResponse;
            service.appCallback = callback;
            return service;
        });
    }
    handleQueryResponse(header, data) {
        const flags = data.readUInt32BE(0);
        const iface = data.readUInt32BE(4);
        const errCode = data.readUInt32BE(8);
        let offset = 12;
        let strError = false;
        let fullName;
        let nullTermIndex = data.indexOf(0, offset);
        if (nullTermIndex < 0) {
            strError = true;
        }
        else {
            fullName = data.toString(undefined, offset, nullTermIndex);
            offset = nullTermIndex + 1;
        }
        const rrType = data.readUInt16BE(offset + 0);
        const rrClass = data.readUInt16BE(offset + 2);
        const rdLen = data.readUInt16BE(offset + 4);
        offset += 6;
        const rData = Buffer.alloc(rdLen);
        data.copy(rData, 0, offset, offset + rdLen);
        offset += rdLen;
        const ttl = data.readUInt32BE(offset);
        this.appCallback(this, flags, iface, errCode, fullName || '', rrType, rrClass, rData, ttl);
    }
}
exports.Service = Service;
//# sourceMappingURL=dnssd-client.js.map