/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * The contents of this file are subject to the Netscape Public
 * License Version 1.1 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of
 * the License at http://www.mozilla.org/NPL/
 *
 * Software distributed under the License is distributed on an "AS
 * IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * rights and limitations under the License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation. All
 * Rights Reserved.
 *
 * Contributor(s): 
 */

#ifndef nsLayoutCID_h__
#define nsLayoutCID_h__

#include "nsISupports.h"
#include "nsIFactory.h"
#include "nsIComponentManager.h"

/* a6cf90fa-15b3-11d2-932e-00805f8add32 */
#define NS_LAYOUT_DOCUMENT_LOADER_FACTORY_CID \
 { 0xa6cf90fa, 0x15b3, 0x11d2,{0x93, 0x2e, 0x00, 0x80, 0x5f, 0x8a, 0xdd, 0x32}}

/* a6cf90f9-15b3-11d2-932e-00805f8add32 */
#define NS_LAYOUT_DEBUGGER_CID \
 { 0xa6cf90f9, 0x15b3, 0x11d2,{0x93, 0x2e, 0x00, 0x80, 0x5f, 0x8a, 0xdd, 0x32}}

/* a6cf90fc-15b3-11d2-932e-00805f8add32 */
#define NS_HTML_ELEMENT_FACTORY_CID \
 { 0xa6cf90fc, 0x15b3, 0x11d2,{0x93, 0x2e, 0x00, 0x80, 0x5f, 0x8a, 0xdd, 0x32}}

#define NS_HTMLDOCUMENT_CID                       \
{ /* 5d0fcdd0-4daa-11d2-b328-00805f8a3859 */      \
 0x5d0fcdd0, 0x4daa, 0x11d2,                      \
 {0xb3, 0x28, 0x00, 0x80, 0x5f, 0x8a, 0x38, 0x59}}

#define NS_XMLDOCUMENT_CID                        \
{ /* a6cf9063-15b3-11d2-932e-00805f8add32 */      \
 0xa6cf9063, 0x15b3, 0x11d2,                      \
 {0x93, 0x2e, 0x00, 0x80, 0x5f, 0x8a, 0xdd, 0x32}}

#define NS_XML_ELEMENT_FACTORY_CID                \
{ /* CF170391-79CC-11d3-BE44-0020A6361667 */      \
 0xcf170391, 0x79cc, 0x11d3,                      \
 {0xbe, 0x44, 0x0, 0x20, 0xa6, 0x36, 0x16, 0x67}}

#define NS_IMAGEDOCUMENT_CID                      \
{ /* e11a6080-4daa-11d2-b328-00805f8a3859 */      \
 0xe11a6080, 0x4daa, 0x11d2,                      \
 {0xb3, 0x28, 0x00, 0x80, 0x5f, 0x8a, 0x38, 0x59}}

#define NS_HTMLIMAGEELEMENT_CID                   \
{ /* d6008c40-4dad-11d2-b328-00805f8a3859 */      \
 0xd6008c40, 0x4dad, 0x11d2,                      \
 {0xb3, 0x28, 0x00, 0x80, 0x5f, 0x8a, 0x38, 0x59}}

#define NS_HTMLOPTIONELEMENT_CID                  \
{ /* a6cf90f5-15b3-11d2-932e-00805f8add32 */      \
 0xa6cf90f5, 0x15b3, 0x11d2,                      \
 {0x93, 0x2e, 0x00, 0x80, 0x5f, 0x8a, 0xdd, 0x32}}

#define NS_NAMESPACEMANAGER_CID                   \
{ /* d9783472-8fe9-11d2-9d3c-0060088f9ff7 */      \
 0xd9783472, 0x8fe9, 0x11d2,                      \
 {0x9d, 0x3c, 0x00, 0x60, 0x08, 0x8f, 0x9f, 0xf7}}

/* a6cf90d7-15b3-11d2-932e-00805f8add32 */
#define NS_FRAME_UTIL_CID \
 { 0xa6cf90d5, 0x15b3, 0x11d2,{0x93, 0x2e, 0x00, 0x80, 0x5f, 0x8a, 0xdd, 0x32}}


// XXX This should really be factored into a style-specific DLL so
// that all the HTML, generic layout, and style stuff isn't munged
// together.

// {2E363D60-872E-11d2-B531-000000000000}
#define NS_CSSPARSER_CID \
{ 0x2e363d60, 0x872e, 0x11d2, { 0xb5, 0x31, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0 } }

// {E6FD9940-899D-11d2-8EAE-00805F29F370}
#define NS_PRESSHELL_CID \
{ 0xe6fd9940, 0x899d, 0x11d2, { 0x8e, 0xae, 0x0, 0x80, 0x5f, 0x29, 0xf3, 0x70 } }

// {96882B70-8A27-11d2-8EAF-00805F29F370}
#define NS_HTMLSTYLESHEET_CID \
{ 0x96882b70, 0x8a27, 0x11d2, { 0x8e, 0xaf, 0x0, 0x80, 0x5f, 0x29, 0xf3, 0x70 } }

// {95F46161-D177-11d2-BF86-00105A1B0627}
#define NS_HTML_CSS_STYLESHEET_CID \
{ 0x95f46161, 0xd177, 0x11d2, { 0xbf, 0x86, 0x0, 0x10, 0x5a, 0x1b, 0x6, 0x27 } }

// {eaca2576-0d4a-11d3-9d7e-0060088f9ff7}
#define NS_CSS_LOADER_CID \
{ 0xeaca2576, 0x0d4a, 0x11d3, { 0x9d, 0x7e, 0x00, 0x60, 0x08, 0x8f, 0x9f, 0xf7 } }

// {96882B71-8A27-11d2-8EAF-00805F29F370}
#define NS_TEXTNODE_CID \
{ 0x96882b71, 0x8a27, 0x11d2, { 0x8e, 0xaf, 0x0, 0x80, 0x5f, 0x29, 0xf3, 0x70 } }

// {96882B72-8A27-11d2-8EAF-00805F29F370}
#define NS_SELECTION_CID \
{ 0x96882b72, 0x8a27, 0x11d2, { 0x8e, 0xaf, 0x0, 0x80, 0x5f, 0x29, 0xf3, 0x70 } }

#define NS_FRAMESELECTION_CID \
{/* {905F80F1-8A7B-11d2-918C-0080C8E44DB5}*/ \
 0x905f80f1, 0x8a7b, 0x11d2, { 0x91, 0x8c, 0x0, 0x80, 0xc8, 0xe4, 0x4d, 0xb5 } }

#define NS_DOMSELECTION_CID \
{/* {C87A37FC-8109-4ce2-A322-8CDEC925379F}*/ \
 0xc87a37fc, 0x8109, 0x4ce2, { 0xa3, 0x22, 0x8c, 0xde, 0xc9, 0x25, 0x37, 0x9f } }

#define NS_RANGE_CID \
{/* {56AD2981-8A87-11d2-918C-0080C8E44DB5}*/ \
 0x56ad2981, 0x8a87, 0x11d2, { 0x91, 0x8c, 0x0, 0x80, 0xc8, 0xe4, 0x4d, 0xb5 } }

#define NS_CONTENTITERATOR_CID \
{/* {a6cf90e3-15b3-11d2-932e-00805f8add32}*/ \
 0xa6cf90e3, 0x15b3, 0x11d2, {0x93, 0x2e, 0x00, 0x80, 0x5f, 0x8a, 0xdd, 0x32 } }

#define NS_GENERATEDSUBTREEITERATOR_CID \
{/* {9A45253B-EB8F-49f1-B925-E9EA90D3EB3A}*/ \
 0x9a45253b, 0xeb8f, 0x49f1, { 0xb9, 0x25, 0xe9, 0xea, 0x90, 0xd3, 0xeb, 0x3a } }

#define NS_GENERATEDCONTENTITERATOR_CID \
{/* {A364930F-E353-49f1-AC69-91637EB8B757}*/ \
 0xa364930f, 0xe353, 0x49f1, { 0xac, 0x69, 0x91, 0x63, 0x7e, 0xb8, 0xb7, 0x57 } }

#define NS_SUBTREEITERATOR_CID \
{/* {a6cf90e5-15b3-11d2-932e-00805f8add32}*/ \
 0xa6cf90e5, 0x15b3, 0x11d2, {0x93, 0x2e, 0x00, 0x80, 0x5f, 0x8a, 0xdd, 0x32 } }

// {09F689E0-B4DA-11d2-A68B-00104BDE6048}
#define NS_EVENTLISTENERMANAGER_CID \
{ 0x9f689e0, 0xb4da, 0x11d2, { 0xa6, 0x8b, 0x0, 0x10, 0x4b, 0xde, 0x60, 0x48 } }

/* a6cf90f7-15b3-11d2-932e-00805f8add32 */
#define NS_PRINT_PREVIEW_CONTEXT_CID \
 { 0xa6cf90f7, 0x15b3, 0x11d2,{0x93, 0x2e, 0x00, 0x80, 0x5f, 0x8a, 0xdd, 0x32}}

// {64F300A1-C88C-11d3-97FB-00400553EEF0}
#define NS_XBLSERVICE_CID \
{ 0x64f300a1, 0xc88c, 0x11d3, { 0x97, 0xfb, 0x0, 0x40, 0x5, 0x53, 0xee, 0xf0 } }

// {15671AF5-39F9-4c70-8CE3-72C97111B52D}
#define NS_BINDINGMANAGER_CID \
{ 0x15671af5, 0x39f9, 0x4c70, { 0x8c, 0xe3, 0x72, 0xc9, 0x71, 0x11, 0xb5, 0x2d } }

// {8775CA39-4072-4cc0-92D3-A7C2B820089C}
#define NS_AUTOCOPYSERVICE_CID \
{ 0x8775ca39, 0x4072, 0x4cc0, { 0x92, 0xd3, 0xa7, 0xc2, 0xb8, 0x20, 0x8, 0x9c } }

// {8775CA39-4072-4cc0-92D3-A7C2B820089C}
#define NS_XIFCONVERTER_CID \
{ 0x13e52e95, 0x3a8a, 0x4a1b, { 0xae, 0x1a, 0x44, 0x30, 0xde, 0xae, 0x4d, 0x21 } }

// 3a9cd622-264d-11d4-ba06-0060b0fc76dd
#define NS_DOM_IMPLEMENTATION_CID \
{ 0x3a9cd622, 0x264d, 0x11d4, {0xba, 0x06, 0x00, 0x60, 0xb0, 0xfc, 0x76, 0xdd } }

// {AE52FE52-683A-437D-B661-DE55F4E0A873}
#define NS_NODEINFOMANAGER_CID \
{ 0xae52fe52, 0x683a, 0x437d, { 0xb6, 0x61, 0xde, 0x55, 0xf4, 0xe0, 0xa8, 0x73 } }

// {ECEA1B28-AE54-4047-8BBE-C624235106B4}
#define NS_COMPUTEDDOMSTYLE_CID \
{ 0xecea1b28, 0xae54, 0x4047, { 0x8b, 0xbe, 0xc6, 0x24, 0x23, 0x51, 0x06, 0xb4 } }


#endif /* nsLayoutCID_h__ */
