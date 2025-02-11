"""
    Test cvslib.py's interface to the 'cvs commit' command.
"""

import os, sys, unittest, pprint
import testsupport
import cvslib


class CommitTestCase(unittest.TestCase):
    def test_simple_commit(self):
        andrew = testsupport.users['andrew']
        top = os.getcwd()
        cvs = cvslib.CVS(cvsroot=testsupport.cvsroot)
        try:
            os.chdir(andrew['home'])
            # Get a working copy.
            cvs.checkout('supper')

            try:
                os.chdir('supper')
                # Add a file to muck with (with a couple changes).
                fname = 'test_simple_commit.txt'
                fout = open(fname, 'w')
                fout.write("hello there\n")
                fout.close()
                cvs.add(fname, msg="test_simple_commit play file")
                result = cvs.commit(fname, msg="add a file for test_simple_commit")
                self.failIf(result['retval'],
                            "A simple 'cvs commit' failed. result=%s" % result)
                #XXX Should test, when .commit() provides parsed results,
                #    that the output is as expected.
            finally:
                os.chdir(andrew['home'])

            testsupport._rmtree('supper')
        finally:
            os.chdir(top)


def suite():
    """Return a unittest.TestSuite to be used by test.py."""
    return unittest.makeSuite(CommitTestCase)

