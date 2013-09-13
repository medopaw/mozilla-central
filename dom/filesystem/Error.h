/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsAutoPtr.h"
#include "nsStringGlue.h"
#include "mozilla/dom/DOMError.h"

class DOMError;

namespace mozilla {
namespace dom {
namespace filesystem {

/*
 * This class is for error handling.
 * All methods in this class are static.
 */
class Error
{
public:
  static void ErrorNameFromCode(nsAString& aErrorName, const nsresult& aErrorCode);
  static DOMError* GetDOMError(const nsAString& aErrorName);
  static DOMError* GetDOMError(const nsresult& aErrorCode);

public:
  static const nsString DOM_ERROR_ENCODING;
  static const nsString DOM_ERROR_INVALID_MODIFICATION;
  static const nsString DOM_ERROR_INVALID_STATE;
  static const nsString DOM_ERROR_NOT_FOUND;
  static const nsString DOM_ERROR_NOT_READABLE;
  static const nsString DOM_ERROR_NO_MODIFICATION_ALLOWED;
  static const nsString DOM_ERROR_PATH_EXISTS;
  static const nsString DOM_ERROR_QUOTA_EXCEEDED;
  static const nsString DOM_ERROR_SECURITY;
  static const nsString DOM_ERROR_TYPE_MISMATCH;
  static const nsString DOM_ERROR_UNKNOWN;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla
